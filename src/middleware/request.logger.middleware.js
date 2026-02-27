import { randomUUID } from "crypto";
import logger from "../core/logger/logger.js";


export const requestLoggerMiddleware = (req, res, next) => {
    req.id = randomUUID();
    req.startTime = process.hrtime.bigint();

    res.setHeader('X-Request-ID', req.id);

    logger.debug("Incoming request", {
        requestId: req.id,           // fixed: 'res.id' → 'req.id'
        method: req.method,          // fixed: 'req.mehtod' → 'req.method'
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        body: _sanitizeBody(req.body), // fixed: '_sanitizedBody' → '_sanitizeBody'
    });

    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - req.startTime) / 1e6;
        const level = res.statusCode >= 500 ? 'error'
                    : res.statusCode >= 400 ? 'warn'
                    : "info";

        logger[level]('Request completed', {
            requestId: req.id,
            method: req.method,          // fixed: 'mehtod' → 'method'
            url: req.originalUrl,
            status: res.statusCode,      // fixed: 'resstatusCode' → 'res.statusCode'
            durationMs: durationMs.toFixed(2),
            ip: req.ip,                  // fixed: 'id: req.ip' → 'ip: req.ip'
        });
    });
    next();
};

const SENSITIVE_FIELDS = ["password", "token", "secret", "authorization"];
const _sanitizeBody = (body) => {
  if (!body || typeof body !== "object") return body;
  return Object.fromEntries(
    Object.entries(body).map(([k, v]) =>
      SENSITIVE_FIELDS.includes(k.toLowerCase()) ? [k, "[REDACTED]"] : [k, v]
    )
  );
};