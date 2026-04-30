// ============================
// 1. auth.middleware.test.js
// ============================
import { jest, beforeEach, describe, it, expect, beforeAll } from '@jest/globals';

const mockVerifyAccessToken = jest.fn();
const mockVerifyRefreshToken = jest.fn();
const mockGenerateTokenPair = jest.fn();
const mockIsRefreshTokenValid = jest.fn();
const mockRevokeRefreshToken = jest.fn();
const mockSaveRefreshToken = jest.fn();
const mockRevokeAllForUser = jest.fn();

jest.unstable_mockModule('../../core/services/jwt.service.js', () => ({
    verifyAccessToken: mockVerifyAccessToken,
    verifyRefreshToken: mockVerifyRefreshToken,
    generateTokenPair: mockGenerateTokenPair,
}));
jest.unstable_mockModule('../../core/services/token_store.service.js', () => ({
    isRefreshTokenValid: mockIsRefreshTokenValid,
    revokeRefreshToken: mockRevokeRefreshToken,
    saveRefreshToken: mockSaveRefreshToken,
    revokeAllForUser: mockRevokeAllForUser,
}));

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    return res;
};
const mockReq = (overrides = {}) => ({
    headers: {},
    cookies: {},
    ip: '127.0.0.1',
    originalUrl: '/test',
    method: 'GET',
    get: jest.fn().mockReturnValue('localhost'),
    ...overrides,
});

let authenticate, requireRole, authorizeAdmin;
beforeAll(async () => {
    const mod = await import('../../middleware/auth.middelware.js');
    authenticate = mod.authenticate;
    requireRole = mod.requireRole;
    authorizeAdmin = mod.authorizeAdmin;
});

const next = jest.fn();
beforeEach(() => {
    jest.clearAllMocks();
    next.mockClear();
});

beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
    console.error.mockRestore();
});

describe('authenticate', () => {
    it('sets req.user when a valid access token is provided', () => {
        const req = mockReq({ headers: { authorization: 'Bearer validAccess' } });
        const res = mockRes();
        const user = { id: '1', email: 'test@test.com', role: 'user' };
        mockVerifyAccessToken.mockReturnValue(user);
        authenticate(req, res, next);
        expect(mockVerifyAccessToken).toHaveBeenCalledWith('validAccess');
        expect(req.user).toBe(user);
        expect(next).toHaveBeenCalledWith();
    });

    it('returns 401 when access token is invalid (not expired)', () => {
        const req = mockReq({ headers: { authorization: 'Bearer badAccess' } });
        const res = mockRes();
        const err = new Error('invalid');
        err.name = 'JsonWebTokenError';
        mockVerifyAccessToken.mockImplementation(() => { throw err; });
        authenticate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid access token' });
        expect(next).not.toHaveBeenCalled();
    });

    it('falls back to refresh token when access token is expired', () => {
        const req = mockReq({
            headers: { authorization: 'Bearer expiredAccess' },
            cookies: { refreshToken: 'validRefresh' },
        });
        const res = mockRes();
        const expiredErr = new Error('expired');
        expiredErr.name = 'TokenExpiredError';
        mockVerifyAccessToken.mockImplementation(() => { throw expiredErr; });

        const decoded = { id: '1', email: 'test@test.com', role: 'user', jti: 'jti1' };
        mockVerifyRefreshToken.mockReturnValueOnce(decoded).mockReturnValueOnce({ jti: 'newJti' });
        mockIsRefreshTokenValid.mockReturnValue(true);
        mockGenerateTokenPair.mockReturnValue({ accessToken: 'newAccess', refreshToken: 'newRefresh' });

        authenticate(req, res, next);

        expect(mockIsRefreshTokenValid).toHaveBeenCalledWith('jti1');
        expect(mockRevokeRefreshToken).toHaveBeenCalledWith('jti1');
        expect(mockGenerateTokenPair).toHaveBeenCalledWith({ id: '1', email: 'test@test.com', role: 'user' });
        expect(mockSaveRefreshToken).toHaveBeenCalledWith('newJti', '1');
        expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'newRefresh', expect.any(Object));
        expect(res.setHeader).toHaveBeenCalledWith('X-New-Access-Token', 'newAccess');
        expect(req.user).toEqual({ id: '1', email: 'test@test.com', role: 'user' });
        expect(next).toHaveBeenCalledWith();
    });

    it('revokes all tokens and returns 401 on reuse detection', () => {
        const req = mockReq({
            headers: { authorization: 'Bearer expiredAccess' },
            cookies: { refreshToken: 'stolenRefresh' },
        });
        const res = mockRes();
        const expiredErr = new Error('expired');
        expiredErr.name = 'TokenExpiredError';
        mockVerifyAccessToken.mockImplementation(() => { throw expiredErr; });
        mockVerifyRefreshToken.mockReturnValue({ id: '1', jti: 'jti1' });
        mockIsRefreshTokenValid.mockReturnValue(false);

        authenticate(req, res, next);

        expect(mockRevokeAllForUser).toHaveBeenCalledWith('1');
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Refresh token reuse detected. Please log in again.',
        });
    });

    it('returns 401 when no tokens present', () => {
        const req = mockReq({ headers: {} });
        const res = mockRes();
        authenticate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Authentication required',
        });
    });

    it('returns 401 when refresh token verification throws', () => {
        const req = mockReq({
            headers: { authorization: 'Bearer expiredAccess' },
            cookies: { refreshToken: 'badRefresh' },
        });
        const res = mockRes();
        const expiredErr = new Error('expired');
        expiredErr.name = 'TokenExpiredError';
        mockVerifyAccessToken.mockImplementation(() => { throw expiredErr; });
        mockVerifyRefreshToken.mockImplementation(() => { throw new Error('invalid refresh'); });

        authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Invalid or expired refresh token',
        });
    });
});

describe('requireRole & authorizeAdmin', () => {
    it('requireRole calls next when role allowed', () => {
        const req = mockReq({ user: { role: 'admin' } });
        const res = mockRes();
        requireRole('admin', 'teacher')(req, res, next);
        expect(next).toHaveBeenCalledWith();
    });

    it('requireRole returns 401 when no user', () => {
        const req = mockReq();
        const res = mockRes();
        requireRole('admin')(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Authentication required',
        });
    });

    it('requireRole returns 403 when role not allowed', () => {
        const req = mockReq({ user: { role: 'user' } });
        const res = mockRes();
        requireRole('admin')(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('authorizeAdmin calls next for admin', () => {
        const req = mockReq({ user: { role: 'admin' } });
        const res = mockRes();
        authorizeAdmin(req, res, next);
        expect(next).toHaveBeenCalledWith();
    });

    it('authorizeAdmin returns 403 for non-admin', () => {
        const req = mockReq({ user: { role: 'user' } });
        const res = mockRes();
        authorizeAdmin(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
    });
});