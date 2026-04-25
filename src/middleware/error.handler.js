// src/middleware/error.handler.js
import { AppError }  from '../core/errors/base.errors.js';
import logger        from '../core/logger/logger.js';
import auditLogger   from '../core/logger/audit.logger.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const sendError = (res, status, code, message, details) => {
    if (res.headersSent) return;   // guard: never double-send
    return res.status(status).json({
        success: false,
        error: {
            code,
            message,
            ...(details && { details }),
        },
    });
};

// ---------------------------------------------------------------------------
// Operational error names — logged at warn, not error
// ---------------------------------------------------------------------------

const OPERATIONAL_NAMES = new Set([
    // Auth
    'JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError',
    // Validation / DB
    'ValidationError', 'CastError',
    // Content flags
    'ContentFlagNotFoundError', 'ContentFlagInvalidIdError',
    'ContentFlagInvalidTaskIdError', 'ContentFlagAlreadyResolvedError',
    'ContentFlagValidationError',
    // Tasks
    'TaskNotFoundError', 'TaskInvalidIdError',
    // Users
    'UserNotFoundError', 'UserValidationError', 'InvalidCredentialsError',
    // Vocab
    'InvalidTopicError', 'VocabularyRuleViolationError',
    'DuplicateVocabularyError', 'VocabularyNotFoundError',
    // HTTP
    'ForbiddenError', 'UnauthorizedError', 'NotFoundError',
]);

// ---------------------------------------------------------------------------
// Main error handler — single middleware, logs + responds
// Replace both errorHandler and errorLoggerMiddleware with this one export.
// Register ONCE at the bottom of app.js: app.use(errorHandler)
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
    // ── Resolve status code ────────────────────────────────────────────────
    // Priority: err.statusCode (set on all custom errors) → err.status → 500
    let status = err.statusCode ?? err.status ?? 500;

    // ── 1. Known AppError subclasses ───────────────────────────────────────
    if (err instanceof AppError) {
        // statusCode, code, message, details already set by the class
        _log(err, status, req);
        return sendError(res, err.statusCode, err.code, err.message, err.details);
    }

    // ── 2. Plain errors with statusCode (content_flag.errors, task.errors…) ─
    // These extend Error directly and set this.statusCode in their constructor.
    if (err.statusCode) {
        _log(err, status, req);
        return sendError(res, err.statusCode, err.name, err.message);
    }

    // ── 3. Auth errors ─────────────────────────────────────────────────────
    if (err.name === 'JsonWebTokenError') {
        return sendError(res, 401, 'INVALID_TOKEN', 'Invalid or malformed token');
    }
    if (err.name === 'TokenExpiredError') {
        return sendError(res, 401, 'TOKEN_EXPIRED', 'Token has expired');
    }
    if (err.name === 'NotBeforeError') {
        return sendError(res, 401, 'TOKEN_NOT_ACTIVE', 'Token is not yet active');
    }

    // ── 4. Mongoose validation ─────────────────────────────────────────────
    if (err.name === 'ValidationError' && err.errors) {
        const details = Object.values(err.errors).map((e) => ({
            field:   e.path,
            message: e.message,
        }));
        _log(err, 400, req);
        return sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed', details);
    }

    // ── 5. express-validator array ─────────────────────────────────────────
    if (Array.isArray(err.errors) && err.errors[0]?.path) {
        const details = err.errors.map((e) => ({ field: e.path, message: e.msg }));
        _log(err, 400, req);
        return sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed', details);
    }

    // ── 6. MongoDB duplicate key ───────────────────────────────────────────
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || 'field';
        _log(err, 409, req);
        return sendError(res, 409, 'DUPLICATE_KEY', `${field} already exists`);
    }

    // ── 7. Mongoose bad ObjectId ───────────────────────────────────────────
    if (err.name === 'CastError') {
        _log(err, 400, req);
        return sendError(res, 400, 'INVALID_ID', 'Invalid resource identifier');
    }

    // ── 8. Fallback — unexpected error ─────────────────────────────────────
    _log(err, 500, req);
    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Something went wrong');
};

// ---------------------------------------------------------------------------
// Internal logger — warn for operational errors, error for everything else
// ---------------------------------------------------------------------------

const _log = (err, status, req) => {
    const isOperational = OPERATIONAL_NAMES.has(err.name);

    const payload = {
        requestId: req?.id,
        errorName: err.name,
        message:   err.message,
        status,
        method:    req?.method,
        url:       req?.originalUrl,
        ip:        req?.ip,
        ...(err.details && { details: err.details }),
        ...(!isOperational && { stack: err.stack }),
    };

    if (isOperational) {
        logger.warn('Operational error', payload);
    } else {
        logger.error('Unexpected error', payload);
        // Only audit truly unexpected failures — not every 404 or validation error
        auditLogger.failure('auth.oauth.failure', {
            message: err.message,
            status,
        }, req);
    }
};