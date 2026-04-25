
import rateLimit from 'express-rate-limit';

const standardConfig = {
    standardHeaders: true,
    legacyHeaders: false,
};

export const apiLimiter = rateLimit({
    ...standardConfig,
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_API_MAX ?? 300),
    message: {
        success: false,
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please try again later.',
    },
});

export const authLimiter = rateLimit({
    ...standardConfig,
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_AUTH_MAX ?? 20),
    message: {
        success: false,
        code: 'TOO_MANY_AUTH_ATTEMPTS',
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
});
