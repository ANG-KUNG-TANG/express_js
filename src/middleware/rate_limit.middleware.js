import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient } from '../core/services/redis.service.js';
import logger from '../core/logger/logger.js';

const skipHealthCheck = (req) => req.path === '/health' || req.path === '/ping';

const makeStore = (prefix) => {
    let store = null;
    let warned = false;
    let initOptions = null; // saved so we can call store.init() after lazy creation

    return {
        // express-rate-limit calls init() once at startup with { windowMs, ... }
        // We save the options and forward to the real store once it's created.
        async init(options) {
            initOptions = options;
            if (store) await store.init(options);
        },

        async increment(key) {
            if (!store) {
                const redis = getRedisClient();
                if (!redis) {
                    if (!warned) {
                        logger.warn(`rate_limit: Redis unavailable — using in-memory fallback for ${prefix}`);
                        warned = true;
                    }
                    return { totalHits: 1, resetTime: undefined };
                }
                store = new RedisStore({
                    sendCommand: (...args) => redis.call(args[0], ...args.slice(1)),
                    prefix,
                });
                // Must call init() so RedisStore sets windowMs before first use
                if (initOptions) await store.init(initOptions);
                logger.debug(`rate_limit: RedisStore initialised for ${prefix}`);
            }
            return store.increment(key);
        },

        async decrement(key) { return store?.decrement(key); },
        async resetKey(key)  { return store?.resetKey(key); },
    };
};

const handler = (req, res, _next, options) => {
    logger.warn('rate_limit: limit hit', {
        path:      req.path,
        ip:        req.ip,
        requestId: req.id,
        limit:     options.max,
        window:    options.windowMs,
    });
    res.status(429).json({
        success:    false,
        message:    typeof options.message === 'string'
                        ? options.message
                        : 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000),
    });
};

// ── Login ─────────────────────────────────────────────────────────────────────
export const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders:   false,
    skip:            skipHealthCheck,
    store:           makeStore('rl:login:'),
    handler,
    skipSuccessfulRequests: true,
    message: 'Too many failed login attempts. Please wait 15 minutes before trying again.',
    keyGenerator: (req) => ipKeyGenerator(req),
});

// ── Register ──────────────────────────────────────────────────────────────────
export const registerRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders:   false,
    skip:            skipHealthCheck,
    store:           makeStore('rl:register:'),
    handler,
    message: 'Too many accounts created from this IP. Please try again in an hour.',
    keyGenerator: (req) => ipKeyGenerator(req),
});

// ── Token refresh ─────────────────────────────────────────────────────────────
export const refreshRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders:   false,
    skip:            skipHealthCheck,
    store:           makeStore('rl:refresh:'),
    handler,
    message: 'Too many token refresh attempts.',
    keyGenerator: (req) => ipKeyGenerator(req),
});

// ── Password reset request ────────────────────────────────────────────────────
export const passwordResetRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders:   false,
    skip:            skipHealthCheck,
    store:           makeStore('rl:pwreset:'),
    handler,
    message: 'Too many password reset requests. Please wait an hour before trying again.',
    keyGenerator: (req) => ipKeyGenerator(req),
});

// ── Email verification resend ─────────────────────────────────────────────────
export const emailVerifyRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders:   false,
    skip:            skipHealthCheck,
    store:           makeStore('rl:emailverify:'),
    handler,
    message: 'Too many verification emails requested. Please wait an hour.',
    keyGenerator: (req) => ipKeyGenerator(req),
});

// ── OAuth ─────────────────────────────────────────────────────────────────────
export const oauthRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders:   false,
    skip:            skipHealthCheck,
    store:           makeStore('rl:oauth:'),
    handler,
    message: 'Too many OAuth attempts. Please wait 15 minutes.',
    keyGenerator: (req) => ipKeyGenerator(req),
});

// ── General API ───────────────────────────────────────────────────────────────
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_API_MAX ?? 300),
    standardHeaders: true,
    legacyHeaders:   false,
    store:           makeStore('rl:api:'),
    handler,
    message: 'Too many requests. Please try again later.',
    keyGenerator: (req) => ipKeyGenerator(req),
});

// ── Auth general ──────────────────────────────────────────────────────────────
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_AUTH_MAX ?? 20),
    standardHeaders: true,
    legacyHeaders:   false,
    store:           makeStore('rl:auth:'),
    handler,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    keyGenerator: (req) => ipKeyGenerator(req),
});

//---Ai Evaluate Rate Limit
export const aiEvaluationRateLimit = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 5,                        // AI_CHECK_DAILY_LIMIT
    standardHeaders: true,
    legacyHeaders:   false,
    store:           makeStore('rl:ai_eval:'),
    handler,
    message: 'AI evaluation limit reached (5/day). Try again tomorrow.',
    // IMPORTANT: keyGenerator should be user ID, not IP, for this specific feature
    keyGenerator: (req) => req.user?.id ?? req.ip, 
});