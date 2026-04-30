// src/tests/middleware/rate_limit.middleware.test.js
import { jest, describe, it, expect, beforeAll } from '@jest/globals';

const mockRateLimit = jest.fn(() => 'mockLimiter');
jest.unstable_mockModule('express-rate-limit', () => ({ default: mockRateLimit }));

let apiLimiter, authLimiter;
beforeAll(async () => {
    const mod = await import('../../middleware/rate_limit.middleware.js');
    apiLimiter = mod.apiLimiter;
    authLimiter = mod.authLimiter;
});

describe('rate_limit.middleware', () => {
    it('exports apiLimiter and authLimiter with correct options', () => {
        // mockRateLimit.calls are intact because we never cleared them
        expect(mockRateLimit).toHaveBeenCalledTimes(2);
        expect(mockRateLimit).toHaveBeenCalledWith(expect.objectContaining({
            windowMs: 15 * 60 * 1000,
            message: expect.objectContaining({ code: 'TOO_MANY_REQUESTS' }),
        }));
        expect(mockRateLimit).toHaveBeenCalledWith(expect.objectContaining({
            windowMs: 15 * 60 * 1000,
            message: expect.objectContaining({ code: 'TOO_MANY_AUTH_ATTEMPTS' }),
        }));
        expect(apiLimiter).toBe('mockLimiter');
        expect(authLimiter).toBe('mockLimiter');
    });
});