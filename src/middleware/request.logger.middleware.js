import { randomUUID } from 'crypto';
import logger from '../core/logger/logger.js';

// Skip static assets and cache hits (304s add no diagnostic value)
const SKIP_PATTERN = /\.(js|css|map|png|jpg|jpeg|svg|ico|woff2?|ttf|eot|webp|gif)(\?.*)?$/i;

const SENSITIVE_FIELDS = new Set(['password', 'token', 'secret', 'authorization']);
const sanitizeBody = (body) => {
    if (!body || typeof body !== 'object') return null;
    const entries = Object.entries(body);
    if (entries.length === 0) return null;
    return Object.fromEntries(
        entries.map(([k, v]) => [k, SENSITIVE_FIELDS.has(k.toLowerCase()) ? '[REDACTED]' : v])
    );
};

export const requestLoggerMiddleware = (req, res, next) => {
    req.id = req.headers['x-request-id'] || randomUUID();
    res.setHeader('X-Request-ID', req.id);

    if (SKIP_PATTERN.test(req.path)) return next();

    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
        const status = res.statusCode;
        if (status === 304) return;

        const ms   = (Number(process.hrtime.bigint() - startedAt) / 1e6).toFixed(2);
        const line = `${req.method} ${req.originalUrl} ${status} ${ms}ms`;
        const meta = {
            requestId: req.id,
            userId: req.user?.id ?? req.user?._id ?? null,
            // only attach body when something went wrong
            ...(status >= 400 && { body: sanitizeBody(req.body) }),
        };

        if      (status >= 500) logger.error(line, meta);
        else if (status >= 400) logger.warn(line, meta);
        else                    logger.info(line, meta);
    });

    next();
};