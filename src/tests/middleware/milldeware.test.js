import { jest, beforeEach, describe, it, expect } from "@jest/globals";
import { errorHandler } from '../../middleware/error.handler.js';
import { AppError } from '../../core/errors/base.errors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockReq = () => ({});

// Grab the response body from the mock
const getBody = (res) => res.json.mock.calls[0][0];
const getStatus = (res) => res.status.mock.calls[0][0];

let next;
beforeEach(() => {
    next = jest.fn();
    jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. AppError (domain / app errors)
// ---------------------------------------------------------------------------

describe('errorHandler — AppError', () => {
    it('uses err.statusCode from the AppError', () => {
        const res = mockRes();
        const err = new AppError('not found', 404, 'NOT_FOUND');
        errorHandler(err, mockReq(), res, next);
        expect(getStatus(res)).toBe(404);
    });

    it('uses err.code from the AppError', () => {
        const res = mockRes();
        const err = new AppError('not found', 404, 'NOT_FOUND');
        errorHandler(err, mockReq(), res, next);
        expect(getBody(res).error.code).toBe('NOT_FOUND');
    });

    it('uses err.message from the AppError', () => {
        const res = mockRes();
        const err = new AppError('not found', 404, 'NOT_FOUND');
        errorHandler(err, mockReq(), res, next);
        expect(getBody(res).error.message).toBe('not found');
    });

    it('includes details when present', () => {
        const res = mockRes();
        const err = new AppError('bad input', 400, 'VALIDATION_ERROR', { field: 'email' });
        errorHandler(err, mockReq(), res, next);
        expect(getBody(res).error.details).toEqual({ field: 'email' });
    });

    it('omits details key when details is null', () => {
        const res = mockRes();
        const err = new AppError('oops', 400, 'SOME_ERROR', null);
        errorHandler(err, mockReq(), res, next);
        expect(getBody(res).error).not.toHaveProperty('details');
    });

    it('always returns success: false', () => {
        const res = mockRes();
        errorHandler(new AppError('x', 400, 'X'), mockReq(), res, next);
        expect(getBody(res).success).toBe(false);
    });

    it('works for AppError subclasses', () => {
        class UserNotFoundError extends AppError {
            constructor(id) {
                super(`User ${id} not found`, 404, 'USER_NOT_FOUND');
            }
        }
        const res = mockRes();
        errorHandler(new UserNotFoundError('42'), mockReq(), res, next);
        expect(getStatus(res)).toBe(404);
        expect(getBody(res).error.code).toBe('USER_NOT_FOUND');
        expect(getBody(res).error.message).toContain('42');
    });
});

// ---------------------------------------------------------------------------
// 2. JWT / Auth errors
// ---------------------------------------------------------------------------

describe('errorHandler — JWT errors', () => {
    it('handles JsonWebTokenError with 401 / INVALID_TOKEN', () => {
        const res = mockRes();
        const err = new Error('jwt malformed');
        err.name = 'JsonWebTokenError';
        errorHandler(err, mockReq(), res, next);
        expect(getStatus(res)).toBe(401);
        expect(getBody(res).error.code).toBe('INVALID_TOKEN');
        expect(getBody(res).error.message).toBe('Invalid or malformed token');
    });

    it('handles TokenExpiredError with 401 / TOKEN_EXPIRED', () => {
        const res = mockRes();
        const err = new Error('jwt expired');
        err.name = 'TokenExpiredError';
        errorHandler(err, mockReq(), res, next);
        expect(getStatus(res)).toBe(401);
        expect(getBody(res).error.code).toBe('TOKEN_EXPIRED');
        expect(getBody(res).error.message).toBe('Token has expired');
    });

    it('handles NotBeforeError with 401 / TOKEN_NOT_ACTIVE', () => {
        const res = mockRes();
        const err = new Error('jwt not active');
        err.name = 'NotBeforeError';
        errorHandler(err, mockReq(), res, next);
        expect(getStatus(res)).toBe(401);
        expect(getBody(res).error.code).toBe('TOKEN_NOT_ACTIVE');
        expect(getBody(res).error.message).toBe('Token is not yet active');
    });
});

// ---------------------------------------------------------------------------
// 3. Validation errors
// ---------------------------------------------------------------------------

describe('errorHandler — Mongoose ValidationError', () => {
    it('returns 400 / VALIDATION_ERROR', () => {
        const res = mockRes();
        const err = {
            name: 'ValidationError',
            errors: {
                email: { path: 'email', message: 'Email is required' },
                name:  { path: 'name',  message: 'Name is required' },
            },
        };
        errorHandler(err, mockReq(), res, next);
        expect(getStatus(res)).toBe(400);
        expect(getBody(res).error.code).toBe('VALIDATION_ERROR');
    });

    it('maps each field error into details', () => {
        const res = mockRes();
        const err = {
            name: 'ValidationError',
            errors: {
                email: { path: 'email', message: 'Invalid email' },
            },
        };
        errorHandler(err, mockReq(), res, next);
        expect(getBody(res).error.details).toEqual([
            { field: 'email', message: 'Invalid email' },
        ]);
    });
});

describe('errorHandler — express-validator errors', () => {
    it('returns 400 / VALIDATION_ERROR', () => {
        const res = mockRes();
        const err = {
            errors: [
                { path: 'email', msg: 'Invalid email' },
                { path: 'password', msg: 'Too short' },
            ],
        };
        errorHandler(err, mockReq(), res, next);
        expect(getStatus(res)).toBe(400);
        expect(getBody(res).error.code).toBe('VALIDATION_ERROR');
    });

    it('maps each error into details with field and message', () => {
        const res = mockRes();
        const err = {
            errors: [{ path: 'email', msg: 'Invalid email' }],
        };
        errorHandler(err, mockReq(), res, next);
        expect(getBody(res).error.details).toEqual([
            { field: 'email', message: 'Invalid email' },
        ]);
    });
});

// ---------------------------------------------------------------------------
// 4. Database errors
// ---------------------------------------------------------------------------

describe('errorHandler — MongoDB duplicate key (11000)', () => {
    it('returns 409 / DUPLICATE_KEY', () => {
        const res = mockRes();
        const err = { code: 11000, keyPattern: { email: 1 } };
        errorHandler(err, mockReq(), res, next);
        expect(getStatus(res)).toBe(409);
        expect(getBody(res).error.code).toBe('DUPLICATE_KEY');
    });

    it('includes the duplicate field name in the message', () => {
        const res = mockRes();
        const err = { code: 11000, keyPattern: { email: 1 } };
        errorHandler(err, mockReq(), res, next);
        expect(getBody(res).error.message).toContain('email');
    });

    it('falls back to "field" when keyPattern is missing', () => {
        const res = mockRes();
        const err = { code: 11000 };
        errorHandler(err, mockReq(), res, next);
        expect(getBody(res).error.message).toContain('field');
    });
});

describe('errorHandler — Mongoose CastError', () => {
    it('returns 400 / INVALID_ID', () => {
        const res = mockRes();
        const err = { name: 'CastError', value: 'bad-id' };
        errorHandler(err, mockReq(), res, next);
        expect(getStatus(res)).toBe(400);
        expect(getBody(res).error.code).toBe('INVALID_ID');
        expect(getBody(res).error.message).toBe('Invalid resource identifier');
    });
});

// ---------------------------------------------------------------------------
// 5. Unhandled / unexpected errors
// ---------------------------------------------------------------------------

describe('errorHandler — unhandled errors', () => {
    it('returns 500 / INTERNAL_SERVER_ERROR', () => {
        const res = mockRes();
        errorHandler(new Error('boom'), mockReq(), res, next);
        expect(getStatus(res)).toBe(500);
        expect(getBody(res).error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('returns generic message instead of leaking internals', () => {
        const res = mockRes();
        errorHandler(new Error('secret db connection string'), mockReq(), res, next);
        expect(getBody(res).error.message).toBe('Something went wrong');
        expect(getBody(res).error.message).not.toContain('secret');
    });

    it('returns success: false', () => {
        const res = mockRes();
        errorHandler(new Error('x'), mockReq(), res, next);
        expect(getBody(res).success).toBe(false);
    });
});