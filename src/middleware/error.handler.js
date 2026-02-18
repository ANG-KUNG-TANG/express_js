import { AppError } from "../errors&exceptions/base.errors.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sendError = (res, status, code, message, details) => {
    const body = {
        success: false,
        error: {
            code,
            message,
            ...(details && { details }),
        },
    };
    return res.status(status).json(body);
};

// ─── Error Handler ────────────────────────────────────────────────────────────

export const errorHandler = (err, req, res, next) => {

    // ── 1. Known AppError (your typed domain/app errors) ──────────────────────
    // Covers all errors that extend AppError:
    //   UserValidationError, UserNotFoundError, InvalidCredentialsError, etc.
    if (err instanceof AppError) {
        return sendError(
            res,
            err.statusCode,
            err.code,
            err.message,
            err.details
        );
    }

    // ── 2. Auth errors (JWT / session libraries) ───────────────────────────────
    if (err.name === 'JsonWebTokenError') {
        return sendError(res, 401, 'INVALID_TOKEN', 'Invalid or malformed token');
    }

    if (err.name === 'TokenExpiredError') {
        return sendError(res, 401, 'TOKEN_EXPIRED', 'Token has expired');
    }

    if (err.name === 'NotBeforeError') {
        return sendError(res, 401, 'TOKEN_NOT_ACTIVE', 'Token is not yet active');
    }

    // ── 3. Validation errors ───────────────────────────────────────────────────

    // Mongoose schema validation
    if (err.name === 'ValidationError') {
        const details = Object.values(err.errors).map((e) => ({
            field:   e.path,
            message: e.message,
        }));
        return sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed', details);
    }

    // express-validator (validationResult array)
    if (Array.isArray(err.errors) && err.errors[0]?.path) {
        const details = err.errors.map((e) => ({
            field:   e.path,
            message: e.msg,
        }));
        return sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed', details);
    }

    // Joi / Yup validation
    if (err.name === 'ValidationError' && err.details) {
        const details = err.details.map((e) => ({
            field:   e.path?.join('.'),
            message: e.message,
        }));
        return sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed', details);
    }

    // ── 4. Database errors ─────────────────────────────────────────────────────

    // MongoDB duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || 'field';
        return sendError(res, 409, 'DUPLICATE_KEY', `${field} already exists`);
    }

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        return sendError(res, 400, 'INVALID_ID', 'Invalid resource identifier');
    }

    // ── 5. Unexpected / unhandled errors ──────────────────────────────────────
    console.error('Unhandled error:', err);
    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Something went wrong');
};