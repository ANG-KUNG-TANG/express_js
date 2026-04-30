// =========================
// 3. logger.middleware.test.js
// =========================
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
    ...overrides,
});

let loggerMiddleware, logger;
beforeAll(async () => {
    loggerMiddleware = (await import('../../middleware/logger.middleware.js')).default;
    logger = (await import('../../core/logger/logger.js')).default;
});

const next = jest.fn();
beforeEach(() => {
    jest.clearAllMocks();
    mockRandomUUID.mockReturnValue('test-uuid-1234');
});

describe('loggerMiddleware', () => {
    it('attaches a UUID request id and sets header', () => {
        const req = mockReq();
        const res = mockRes();
        loggerMiddleware(req, res, next);
        expect(req.id).toBe('test-uuid-1234');
        expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'test-uuid-1234');
    });

    it('reuses existing x-request-id header', () => {
        const req = mockReq({ headers: { 'x-request-id': 'existing-id' } });
        const res = mockRes();
        loggerMiddleware(req, res, next);
        expect(req.id).toBe('existing-id');
        expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'existing-id');
    });

    it('logs the incoming request with debug level', () => {
        const req = mockReq({ method: 'POST', originalUrl: '/items', ip: '10.0.0.1' });
        const res = mockRes();
        loggerMiddleware(req, res, next);
        expect(logger.debug).toHaveBeenCalledWith('http.request', expect.objectContaining({
            requestId: 'test-uuid-1234',
            method: 'POST',
            url: '/items',
            ip: '10.0.0.1',
        }));
    });

    it('logs 2xx response with info', () => {
        const req = mockReq();
        const res = mockRes();
        res.statusCode = 200;
        loggerMiddleware(req, res, next);
        const finishHandler = res.on.mock.calls.find(c => c[0] === 'finish')[1];
        finishHandler();
        expect(logger.info).toHaveBeenCalledWith('http.response', expect.objectContaining({ status: 200 }));
    });

    it('logs 4xx response with warn', () => {
        const req = mockReq();
        const res = mockRes();
        res.statusCode = 404;
        loggerMiddleware(req, res, next);
        const finishHandler = res.on.mock.calls.find(c => c[0] === 'finish')[1];
        finishHandler();
        expect(logger.warn).toHaveBeenCalled();
    });

    it('logs 5xx response with error', () => {
        const req = mockReq();
        const res = mockRes();
        res.statusCode = 500;
        loggerMiddleware(req, res, next);
        const finishHandler = res.on.mock.calls.find(c => c[0] === 'finish')[1];
        finishHandler();
        expect(logger.error).toHaveBeenCalled();
    });
});