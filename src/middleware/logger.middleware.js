// src/middleware/logger_middleware.js
//
// HTTP request/response logger middleware.
// Attaches a unique requestId to every request, logs method + path + status
// + duration, and passes the id forward so audit logs can reference it.
//
// Usage (in app.js / server.js, before all other middleware):
//   import loggerMiddleware from './middleware/logger_middleware.js';
//   app.use(loggerMiddleware);

import { randomUUID } from 'crypto';
import logger from '../core/logger/logger.js';

const loggerMiddleware = (req, res, next) => {
    // Attach a unique id so this request can be correlated across all log lines
    req.id = req.headers['x-request-id'] || randomUUID();
    res.setHeader('x-request-id', req.id);

    const startedAt = Date.now();
    const { method, originalUrl, ip } = req;

    // Log when the request arrives
    logger.debug('http.request', {
        requestId: req.id,
        method,
        url:       originalUrl,
        ip:        ip || req.headers['x-forwarded-for'] || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
    });

    // Capture response details once the response is finished
    res.on('finish', () => {
        const duration = Date.now() - startedAt;
        const { statusCode } = res;

        const logFn =
            statusCode >= 500 ? logger.error.bind(logger) :
            statusCode >= 400 ? logger.warn.bind(logger)  :
            logger.info.bind(logger);

        logFn('http.response', {
            requestId: req.id,
            method,
            url:        originalUrl,
            status:     statusCode,
            durationMs: duration,
            userId:     req.user?.id ?? req.user?._id ?? null,
        });
    });

    next();
};

export default loggerMiddleware;