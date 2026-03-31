// src/core/logger/audit.logger.js

import winston               from 'winston';
import path                  from 'path';
import { fileURLToPath }     from 'url';
import fs                    from 'fs';
import { createLog }         from '../../infrastructure/repositories/audit_log_repo.js';
import { isKnownAction }     from '../../domain/base/audit_enums.js';
import { emitToAdmins }      from '../services/socket.service.js';
import logger                from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR   = path.resolve(__dirname, '../../../logs');

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const auditFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
);

const auditWinston = winston.createLogger({
    level: 'info',
    transports: [
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'audit.log'),
            format:   auditFormat,
            maxsize:  10 * 1024 * 1024,
            maxFiles: 20,
            tailable: true,
        }),
        ...(process.env.NODE_ENV !== 'production'
            ? [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.timestamp({ format: 'HH:mm:ss' }),
                        winston.format.colorize(),
                        winston.format.printf(
                            ({ timestamp, message }) => `[AUDIT ${timestamp}] ${message}`
                        )
                    ),
                }),
            ]
            : []),
    ],
    exitOnError: false,
});

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

/**
 * Record an audit event — writes to file (Winston), persists to MongoDB,
 * and pushes the entry in real time to all connected admin dashboards.
 *
 * requesterId resolution priority:
 *   1. req.user._id  (set by auth middleware)
 *   2. details.requesterId  (explicit override for background jobs)
 *   3. null
 */
const log = (action, details = {}, req = null, outcome = 'success') => {
    if (!isKnownAction(action)) {
        logger.warn('auditLogger: unknown action string — check AuditAction enum', { action });
    }

    const requesterId =
        req?.user?._id?.toString()
        ?? req?.user?.id?.toString()
        ?? details.requesterId
        ?? null;

    const requestMeta = req
        ? {
            method:    req.method,
            path:      req.originalUrl || req.path,
            ip:        req.ip || req.headers?.['x-forwarded-for'] || 'unknown',
            userAgent: req.headers?.['user-agent'] || 'unknown',
            requestId: req.id || null,
          }
        : null;

    const entry = {
        action,
        outcome,
        requesterId,
        details,
        ...(requestMeta && { request: requestMeta }),
    };

    // 1. Write to file
    auditWinston.info(action, entry);

    // 2. Persist to MongoDB — then emit to admin dashboards with the saved doc
    //    so the frontend gets the real _id and createdAt the DB assigned.
    createLog({
        action,
        outcome,
        requesterId,
        details,
        request: requestMeta,
    }).then((saved) => {
        if (!saved) return;

        // Push the full serialized log entry to every connected admin.
        // toJSON() on the AuditLog entity ensures public field names are used.
        emitToAdmins('audit:new', saved);
    }).catch((err) => {
        logger.error('auditLogger: failed to emit audit:new', { error: err.message });
    });
};

/**
 * Shorthand for a failed audit event.
 */
const failure = (action, details = {}, req = null) =>
    log(action, details, req, 'failure');

const auditLogger = { log, failure };
export default auditLogger;