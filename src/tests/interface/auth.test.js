import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import express from 'express';
import cookieParser from 'cookie-parser';

// ---------------------------------------------------------------------------
// ESM mocks — jest.unstable_mockModule MUST come before any dynamic imports
// ---------------------------------------------------------------------------

jest.unstable_mockModule('passport', () => {
    const passport = {
        authenticate: jest.fn(),
        use:          jest.fn(),
        initialize:   jest.fn(() => (_req, _res, next) => next()),
    };
    return { default: passport };
});

jest.unstable_mockModule('../../core/services/jwt.service.js', () => ({
    generateTokenPair:  jest.fn(),
    verifyRefreshToken: jest.fn(),
}));

jest.unstable_mockModule('../../core/services/token_store.service.js', () => ({
    saveRefreshToken:    jest.fn(),
    revokeRefreshToken:  jest.fn(),
    isRefreshTokenValid: jest.fn(),
    revokeAllForUser:    jest.fn(),
}));

jest.unstable_mockModule('../../interfaces/response_formatter.js', () => ({
    sendSuccess: jest.fn((res, data, status) => res.status(status).json({ success: true, data })),
}));

jest.unstable_mockModule('../../interfaces/http_status.js', () => ({
    HTTP_STATUS: { OK: 200, UNAUTHORIZED: 401, CREATED: 201 },
}));

// ── Passport strategy mocks — prevents "OAuth2Strategy requires a clientID"
// error when initPassport() is called without real env vars in tests.
// We mock the constructor classes; passport.use() is already mocked above,
// so we just need the Strategy classes to be dummy constructors.
jest.unstable_mockModule('passport-google-oauth20', () => {
    function GoogleStrategy(options, verify) {
        this.name    = 'google';
        this.options = options;
        this.verify  = verify;
    }
    return { Strategy: GoogleStrategy };
});

jest.unstable_mockModule('passport-github2', () => {
    function GithubStrategy(options, verify) {
        this.name    = 'github';
        this.options = options;
        this.verify  = verify;
    }
    return { Strategy: GithubStrategy };
});

// ---------------------------------------------------------------------------
// Dynamic imports AFTER mocks
// ---------------------------------------------------------------------------

const { default: passport }                     = await import('passport');
const { generateTokenPair, verifyRefreshToken }  = await import('../../core/services/jwt.service.js');
const {
    saveRefreshToken,
    revokeRefreshToken,
    isRefreshTokenValid,
    revokeAllForUser,
}                                               = await import('../../core/services/token_store.service.js');

const {
    googleAuth,
    githubAuth,
    googleCallback,
    githubCallback,
    refreshTokens,
    logout,
    authFailure,
} = await import('../../interfaces/table/auth.controller.js');

// supertest imported lazily so mocks are already wired up
const { default: request } = await import('supertest');

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

const buildApp = () => {
    const app = express();
    app.use(cookieParser());
    app.use(express.json());

    app.get('/auth/google',          googleAuth);
    app.get('/auth/github',          githubAuth);
    app.get('/auth/google/callback', ...googleCallback);
    app.get('/auth/github/callback', ...githubCallback);
    app.post('/auth/refresh',        refreshTokens);
    app.post('/auth/logout',         logout);
    app.get('/auth/failure',         authFailure);

    return app;
};

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const FAKE_USER          = { id: 'user-1', email: 'test@example.com', role: 'user' };
const FAKE_ACCESS_TOKEN  = 'access.token.here';
const FAKE_REFRESH_TOKEN = 'refresh.token.here';
const FAKE_JTI           = 'jti-abc-123';

const setupIssueTokensMocks = () => {
    generateTokenPair.mockReturnValue({
        accessToken:  FAKE_ACCESS_TOKEN,
        refreshToken: FAKE_REFRESH_TOKEN,
    });
    verifyRefreshToken.mockReturnValue({
        jti:   FAKE_JTI,
        id:    FAKE_USER.id,
        email: FAKE_USER.email,
        role:  FAKE_USER.role,
    });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Auth Controller', () => {
    let app;

    beforeEach(() => {
        app = buildApp();
        jest.clearAllMocks();
    });

    // ── OAuth initiators ───────────────────────────────────────────────────

    describe('GET /auth/google — googleAuth initiator', () => {
        it('calls passport.authenticate with "google" and correct options', async () => {
            passport.authenticate.mockImplementation(() => (_req, res) => {
                res.redirect('https://accounts.google.com/oauth/fake');
            });

            await request(app).get('/auth/google').expect(302);

            expect(passport.authenticate).toHaveBeenCalledWith(
                'google',
                expect.objectContaining({ scope: ['profile', 'email'], session: false }),
            );
        });
    });

    describe('GET /auth/github — githubAuth initiator', () => {
        it('calls passport.authenticate with "github" and correct options', async () => {
            passport.authenticate.mockImplementation(() => (_req, res) => {
                res.redirect('https://github.com/login/oauth/fake');
            });

            await request(app).get('/auth/github').expect(302);

            expect(passport.authenticate).toHaveBeenCalledWith(
                'github',
                expect.objectContaining({ scope: ['user:email'], session: false }),
            );
        });
    });

    // ── OAuth callbacks ────────────────────────────────────────────────────

    describe('GET /auth/google/callback', () => {
        it('issues tokens and returns 200 on success', async () => {
            setupIssueTokensMocks();

            passport.authenticate.mockImplementationOnce(
                () => (req, _res, next) => { req.user = FAKE_USER; next(); },
            );

            const res = await request(app).get('/auth/google/callback').expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.accessToken).toBe(FAKE_ACCESS_TOKEN);
            expect(res.headers['set-cookie']).toBeDefined();
            expect(saveRefreshToken).toHaveBeenCalledWith(FAKE_JTI, FAKE_USER.id);
        });

        it('redirects to /auth/failure when authentication fails', async () => {
            passport.authenticate.mockImplementationOnce(
                () => (_req, res) => res.redirect('/auth/failure'),
            );

            await request(app).get('/auth/google/callback').expect(302);
        });
    });

    describe('GET /auth/github/callback', () => {
        it('issues tokens and returns 200 on success', async () => {
            setupIssueTokensMocks();

            passport.authenticate.mockImplementationOnce(
                () => (req, _res, next) => { req.user = FAKE_USER; next(); },
            );

            const res = await request(app).get('/auth/github/callback').expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.accessToken).toBe(FAKE_ACCESS_TOKEN);
        });
    });

    // ── Refresh token ──────────────────────────────────────────────────────

    describe('POST /auth/refresh', () => {
        it('returns 401 when no refresh token cookie is present', async () => {
            const res = await request(app).post('/auth/refresh').expect(401);
            expect(res.body.message).toMatch(/no refresh token/i);
        });

        it('returns 401 when the refresh token is invalid / expired', async () => {
            verifyRefreshToken.mockImplementationOnce(() => { throw new Error('expired'); });

            const res = await request(app)
                .post('/auth/refresh')
                .set('Cookie', [`refreshToken=${FAKE_REFRESH_TOKEN}`])
                .expect(401);

            expect(res.body.message).toMatch(/invalid or expired/i);
        });

        it('detects token reuse, revokes all sessions, returns 401', async () => {
            verifyRefreshToken.mockReturnValue({ jti: FAKE_JTI, id: FAKE_USER.id });
            isRefreshTokenValid.mockReturnValue(false);

            const res = await request(app)
                .post('/auth/refresh')
                .set('Cookie', [`refreshToken=${FAKE_REFRESH_TOKEN}`])
                .expect(401);

            expect(revokeAllForUser).toHaveBeenCalledWith(FAKE_USER.id);
            expect(res.body.message).toMatch(/reuse detected/i);
        });

        it('rotates tokens and returns new accessToken on valid refresh', async () => {
            const NEW_ACCESS  = 'new.access.token';
            const NEW_REFRESH = 'new.refresh.token';
            const NEW_JTI     = 'jti-new-456';

            verifyRefreshToken
                .mockReturnValueOnce({ jti: FAKE_JTI, id: FAKE_USER.id, email: FAKE_USER.email, role: FAKE_USER.role })
                .mockReturnValueOnce({ jti: NEW_JTI,  id: FAKE_USER.id, email: FAKE_USER.email, role: FAKE_USER.role });

            isRefreshTokenValid.mockReturnValue(true);
            generateTokenPair.mockReturnValue({ accessToken: NEW_ACCESS, refreshToken: NEW_REFRESH });

            const res = await request(app)
                .post('/auth/refresh')
                .set('Cookie', [`refreshToken=${FAKE_REFRESH_TOKEN}`])
                .expect(200);

            expect(revokeRefreshToken).toHaveBeenCalledWith(FAKE_JTI);
            expect(saveRefreshToken).toHaveBeenCalledWith(NEW_JTI, FAKE_USER.id);
            expect(res.body.data.accessToken).toBe(NEW_ACCESS);
            expect(res.headers['set-cookie']).toBeDefined();
        });
    });

    // ── Logout ─────────────────────────────────────────────────────────────

    describe('POST /auth/logout', () => {
        it('revokes the refresh token and clears the cookie', async () => {
            verifyRefreshToken.mockReturnValue({ jti: FAKE_JTI });

            const res = await request(app)
                .post('/auth/logout')
                .set('Cookie', [`refreshToken=${FAKE_REFRESH_TOKEN}`])
                .expect(200);

            expect(revokeRefreshToken).toHaveBeenCalledWith(FAKE_JTI);
            const cookies = res.headers['set-cookie'] ?? [];
            const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
            expect(refreshCookie).toBeDefined();
            expect(refreshCookie).toMatch(/expires=Thu, 01 Jan 1970|Max-Age=0/i);
            expect(res.body.data.message).toMatch(/logged out/i);
        });

        it('still succeeds (200) when no refresh token cookie is present', async () => {
            const res = await request(app).post('/auth/logout').expect(200);
            expect(revokeRefreshToken).not.toHaveBeenCalled();
            expect(res.body.success).toBe(true);
        });

        it('still succeeds when the refresh token is invalid (swallows error)', async () => {
            verifyRefreshToken.mockImplementationOnce(() => { throw new Error('bad token'); });

            const res = await request(app)
                .post('/auth/logout')
                .set('Cookie', [`refreshToken=bad.token`])
                .expect(200);

            expect(revokeRefreshToken).not.toHaveBeenCalled();
            expect(res.body.success).toBe(true);
        });
    });

    // ── Failure fallback ───────────────────────────────────────────────────

    describe('GET /auth/failure', () => {
        it('returns 401 with an OAuth failure message', async () => {
            const res = await request(app).get('/auth/failure').expect(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/oauth authentication failed/i);
        });
    });

    // ── issueTokens helper (tested through callback) ───────────────────────

    describe('issueTokens helper', () => {
        it('sets an httpOnly SameSite=Strict cookie', async () => {
            setupIssueTokensMocks();

            passport.authenticate.mockImplementationOnce(
                () => (req, _res, next) => { req.user = FAKE_USER; next(); },
            );

            const res = await request(app).get('/auth/google/callback').expect(200);
            const cookies = res.headers['set-cookie'] ?? [];
            const rc = cookies.find((c) => c.startsWith('refreshToken='));

            expect(rc).toMatch(/HttpOnly/i);
            expect(rc).toMatch(/SameSite=Strict/i);
        });

        it('uses user._email / user._role when present', async () => {
            const privateUser = { id: 'u2', _email: 'priv@example.com', _role: 'admin' };

            generateTokenPair.mockReturnValue({
                accessToken:  FAKE_ACCESS_TOKEN,
                refreshToken: FAKE_REFRESH_TOKEN,
            });
            verifyRefreshToken.mockReturnValue({ jti: FAKE_JTI, id: privateUser.id });

            passport.authenticate.mockImplementationOnce(
                () => (req, _res, next) => { req.user = privateUser; next(); },
            );

            await request(app).get('/auth/google/callback').expect(200);

            expect(generateTokenPair).toHaveBeenCalledWith(
                expect.objectContaining({ email: 'priv@example.com', role: 'admin' }),
            );
        });
    });
});