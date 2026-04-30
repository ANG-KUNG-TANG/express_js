// ===================================
// 5. request.logger.middleware.test.js
// ===================================
import { jest, beforeEach, describe, it, expect, beforeAll } from '@jest/globals';

const loggerMock = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
const mockRandomUUID = jest.fn();

jest.unstable_mockModule('../../core/logger/logger.js', () => ({ default: loggerMock }));
jest.unstable_mockModule('crypto', () => ({ randomUUID: mockRandomUUID }));

const mockRes = () => {
    const res = {};
    res.setHeader = jest.fn().mockReturnValue(res);
    res.on = jest.fn().mockReturnValue(res);
    return res;
};
const mockReq = (overrides = {}) => ({
    headers: {},
    ip: '127.0.0.1',
    originalUrl: '/test',
    method: 'GET',
    get: jest.fn().mockReturnValue('localhost'),
    body: undefined,
    ...overrides,
});

let requestLoggerMiddleware, logger;
beforeAll(async () => {
    const mod = await import('../../middleware/request.logger.middleware.js');
    requestLoggerMiddleware = mod.requestLoggerMiddleware;
    logger = (await import('../../core/logger/logger.js')).default;
});

const next = jest.fn();
beforeEach(() => {
    jest.clearAllMocks();
    mockRandomUUID.mockReturnValue('test-uuid-1234');
});

describe('requestLoggerMiddleware', () => {
    it('sets a UUID request id and X-Request-ID header', () => {
        const req = mockReq();
        const res = mockRes();
        requestLoggerMiddleware(req, res, next);
        expect(req.id).toBe('test-uuid-1234');
        expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', 'test-uuid-1234');
    });

    it('logs incoming request with sanitized body', () => {
        const req = mockReq({ body: { username: 'john', password: 'secret' }, method: 'POST' });
        const res = mockRes();
        requestLoggerMiddleware(req, res, next);
        expect(logger.debug).toHaveBeenCalledWith('Incoming request', expect.objectContaining({
            body: { username: 'john', password: '[REDACTED]' },
        }));
    });

    it('logs request completed with info for 2xx', () => {
        const req = mockReq();
        const res = mockRes();
        res.statusCode = 200;
        requestLoggerMiddleware(req, res, next);
        const finishHandler = res.on.mock.calls.find(c => c[0] === 'finish')[1];
        finishHandler();
        expect(logger.info).toHaveBeenCalledWith('Request completed', expect.objectContaining({
            status: 200,
            durationMs: expect.stringMatching(/^\d+\.\d+$/),
        }));
    });

    it('logs request completed with error for 5xx', () => {
        const req = mockReq();
        const res = mockRes();
        res.statusCode = 500;
        requestLoggerMiddleware(req, res, next);
        const finishHandler = res.on.mock.calls.find(c => c[0] === 'finish')[1];
        finishHandler();
        expect(logger.error).toHaveBeenCalled();
    });
});