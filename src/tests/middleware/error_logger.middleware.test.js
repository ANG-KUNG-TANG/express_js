// ====================================
// 2. error.logger.middleware.test.js
// ====================================
import { jest, beforeEach, describe, it, expect, beforeAll } from '@jest/globals';

const loggerMock = { warn: jest.fn(), error: jest.fn() };
const auditLoggerMock = { failure: jest.fn() };

jest.unstable_mockModule('../../core/logger/logger.js', () => ({ default: loggerMock }));
jest.unstable_mockModule('../../core/logger/audit.logger.js', () => ({ default: auditLoggerMock }));

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};
const mockReq = (overrides = {}) => ({
    id: 'req-1',
    ip: '127.0.0.1',
    originalUrl: '/test',
    method: 'GET',
    ...overrides,
});

let errorLoggerMiddleware, logger, auditLogger;
beforeAll(async () => {
    errorLoggerMiddleware = (await import('../../middleware/error.logger.middleware.js')).errorLoggerMiddleware;
    logger = (await import('../../core/logger/logger.js')).default;
    auditLogger = (await import('../../core/logger/audit.logger.js')).default;
});

const next = jest.fn();
beforeEach(() => jest.clearAllMocks());

describe('errorLoggerMiddleware', () => {
    it('logs operational errors at warn level and sends response', () => {
        const req = mockReq();
        const res = mockRes();
        const err = new Error('Validation failed');
        err.name = 'ValidationError';
        err.details = { field: 'email' };
        errorLoggerMiddleware(err, req, res, next);
        expect(logger.warn).toHaveBeenCalledWith('Operational error', expect.objectContaining({
            requestId: req.id,
            errorName: 'ValidationError',
            message: 'Validation failed',
            status: 400,
            details: { field: 'email' },
        }));
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: {
                name: 'ValidationError',
                message: 'Validation failed',
                details: { field: 'email' },
                requestId: req.id,
            },
        });
    });

    it('logs unexpected errors at error level and includes stack in non‑production', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        const req = mockReq();
        const res = mockRes();
        const err = new Error('boom');
        err.stack = 'stack trace';
        errorLoggerMiddleware(err, req, res, next);
        expect(logger.error).toHaveBeenCalledWith('Unexpected error', expect.objectContaining({
            stack: 'stack trace',
        }));
        expect(auditLogger.failure).toHaveBeenCalled();
        expect(res.json.mock.calls[0][0].error.stack).toBe('stack trace');
        process.env.NODE_ENV = originalEnv;
    });

    it('removes stack in production', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        const req = mockReq();
        const res = mockRes();
        const err = new Error('boom');
        err.stack = 'stack trace';
        errorLoggerMiddleware(err, req, res, next);
        expect(res.json.mock.calls[0][0].error).not.toHaveProperty('stack');
        process.env.NODE_ENV = originalEnv;
    });
});