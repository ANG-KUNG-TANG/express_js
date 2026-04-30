// ==========================
// 6. role.middleware.test.js
// ==========================
import { jest, beforeEach, describe, it, expect, beforeAll } from '@jest/globals';

jest.unstable_mockModule('../../core/errors/http.errors.js', () => ({
    UnauthorizedError: class extends Error { constructor(msg) { super(msg); this.statusCode = 401; } },
    ForbiddenError: class extends Error { constructor(msg) { super(msg); this.statusCode = 403; } },
}));

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};
const mockReq = (overrides = {}) => ({
    headers: {},
    ...overrides,
});

let requireRole;
beforeAll(async () => {
    requireRole = (await import('../../middleware/role.middleware.js')).requireRole;
});

const next = jest.fn();
beforeEach(() => jest.clearAllMocks());

describe('role.middleware', () => {
    it('calls next with UnauthorizedError when req.user missing', () => {
        const req = mockReq();
        const res = mockRes();
        requireRole('admin')(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Authentication required',
            statusCode: 401,
        }));
    });

    it('calls next with ForbiddenError when role not included', () => {
        const req = mockReq({ user: { role: 'user' } });
        const res = mockRes();
        requireRole('admin', 'teacher')(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining("Role 'user' is not permitted"),
            statusCode: 403,
        }));
    });

    it('calls next() when role allowed', () => {
        const req = mockReq({ user: { role: 'teacher' } });
        const res = mockRes();
        requireRole('admin', 'teacher')(req, res, next);
        expect(next).toHaveBeenCalledWith();
    });
});