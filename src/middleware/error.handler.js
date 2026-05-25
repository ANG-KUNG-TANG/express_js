// src/middleware/error.handler.js
import { AppError }  from '../core/errors/base.errors.js';
import logger        from '../core/logger/logger.js';
import auditLogger   from '../core/logger/audit.logger.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const sendError = (res, status, code, message, details) => {
    if (res.headersSent) return;
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
    // CSRF
    'ForbiddenError',
    // Account state (login-time)
    'EmailNotVerifiedError', 'AccountSuspendedError',
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
    'UserEmailNotFoundError',
    // Vocab
    'InvalidTopicError', 'VocabularyRuleViolationError',
    'DuplicateVocabularyError', 'VocabularyNotFoundError',
    // HTTP
    'UnauthorizedError', 'NotFoundError',
]);

// ---------------------------------------------------------------------------
// Main error handler
// Register ONCE at the bottom of app.js: app.use(errorHandler)
// Replaces both errorHandler and errorLoggerMiddleware — remove
// app.use(errorLoggerMiddleware) from server.js if still present.
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {

    // ── 0. CSRF ────────────────────────────────────────────────────────────
    // csrf-csrf throws ForbiddenError with no .code set.
    // App-level ForbiddenError subclasses (EmailNotVerifiedError, AccountSuspendedError,
    // UserInsufficientPermissionError) all set this.code, so the !err.code guard
    // keeps them out of this branch and lets them fall through to case 2.
    if ((err.name === 'ForbiddenError' && !err.code) || err.code === 'EBADCSRFTOKEN') {
        _log(err, 403, req);
        return sendError(res, 403, 'CSRF_INVALID', 'Invalid or missing CSRF token');
    }

    // ── Resolve status code ────────────────────────────────────────────────
    const status = err.statusCode ?? err.status ?? 500;

    // ── 1. Known AppError subclasses ───────────────────────────────────────
    if (err instanceof AppError) {
        _log(err, status, req);
        return sendError(res, err.statusCode, err.code, err.message, err.details);
    }

    // ── 2. Plain errors with statusCode (http.errors.js hierarchy) ────────
    // Covers NotFoundError, ForbiddenError subclasses, UnauthorizedError subclasses,
    // ValidationError, ConflictError, etc. — all set this.statusCode in their constructor.
    if (err.statusCode) {
        _log(err, status, req);
        return sendError(res, err.statusCode, err.code ?? err.name, err.message);
    }

    // ── 3. Auth / JWT errors ───────────────────────────────────────────────
    if (err.name === 'JsonWebTokenError') {
        _log(err, 401, req);
        return sendError(res, 401, 'INVALID_TOKEN', 'Invalid or malformed token');
    }
    if (err.name === 'TokenExpiredError') {
        _log(err, 401, req);
        return sendError(res, 401, 'TOKEN_EXPIRED', 'Token has expired');
    }
    if (err.name === 'NotBeforeError') {
        _log(err, 401, req);
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
        auditLogger.failure('server.unexpected_error', {
            message: err.message,
            status,
        }, req);
    }
};