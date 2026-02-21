/**
 * jwt.service.test.js
 *
 * Tests the real jwt.service — no mocks. Requires jest.setup.js to have
 * seeded JWT_ACCESS_SECRET and JWT_REFRESH_SECRET before this file loads.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Dynamic import — must happen after env vars are set (jest.setup.js handles this)
// ---------------------------------------------------------------------------

const {
    generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    verifyAccessToken,
    verifyRefreshToken,
} = await import('../../core/services/jwt.service.js');

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const SAMPLE_PAYLOAD = { id: 'user-1', email: 'test@example.com', role: 'user' };

// ---------------------------------------------------------------------------
// generateAccessToken
// ---------------------------------------------------------------------------

describe('generateAccessToken', () => {
    it('returns a non-empty string', () => {
        const token = generateAccessToken(SAMPLE_PAYLOAD);
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(0);
    });

    it('produces a valid JWT with three segments', () => {
        const token = generateAccessToken(SAMPLE_PAYLOAD);
        expect(token.split('.')).toHaveLength(3);
    });

    it('embeds the payload claims', () => {
        const token   = generateAccessToken(SAMPLE_PAYLOAD);
        const decoded = jwt.verify(token, ACCESS_SECRET);
        expect(decoded.id).toBe(SAMPLE_PAYLOAD.id);
        expect(decoded.email).toBe(SAMPLE_PAYLOAD.email);
        expect(decoded.role).toBe(SAMPLE_PAYLOAD.role);
    });

    it('signs with the access secret (fails with wrong secret)', () => {
        const token = generateAccessToken(SAMPLE_PAYLOAD);
        expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
    });

    it('includes an exp claim', () => {
        const token   = generateAccessToken(SAMPLE_PAYLOAD);
        const decoded = jwt.decode(token);
        expect(decoded.exp).toBeDefined();
        expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('uses the JWT_ACCESS_EXPIRY env var (defaults to 15m)', () => {
        const token   = generateAccessToken(SAMPLE_PAYLOAD);
        const decoded = jwt.decode(token);
        const ttl = decoded.exp - decoded.iat;
        // Default is 15m = 900s; allow a small margin for test execution time
        expect(ttl).toBeLessThanOrEqual(900);
        expect(ttl).toBeGreaterThan(850);
    });

    it('does NOT add a jti claim', () => {
        const decoded = jwt.decode(generateAccessToken(SAMPLE_PAYLOAD));
        expect(decoded.jti).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// generateRefreshToken
// ---------------------------------------------------------------------------

describe('generateRefreshToken', () => {
    it('returns a valid JWT string', () => {
        const token = generateRefreshToken(SAMPLE_PAYLOAD);
        expect(token.split('.')).toHaveLength(3);
    });

    it('embeds the payload claims', () => {
        const token   = generateRefreshToken(SAMPLE_PAYLOAD);
        const decoded = jwt.verify(token, REFRESH_SECRET);
        expect(decoded.id).toBe(SAMPLE_PAYLOAD.id);
        expect(decoded.email).toBe(SAMPLE_PAYLOAD.email);
    });

    it('signs with the refresh secret (fails with access secret)', () => {
        const token = generateRefreshToken(SAMPLE_PAYLOAD);
        expect(() => jwt.verify(token, ACCESS_SECRET)).toThrow();
    });

    it('adds a unique jti (UUID) claim', () => {
        const decoded = jwt.decode(generateRefreshToken(SAMPLE_PAYLOAD));
        expect(decoded.jti).toBeDefined();
        expect(typeof decoded.jti).toBe('string');
        expect(decoded.jti).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
    });

    it('produces a different jti on every call', () => {
        const jti1 = jwt.decode(generateRefreshToken(SAMPLE_PAYLOAD)).jti;
        const jti2 = jwt.decode(generateRefreshToken(SAMPLE_PAYLOAD)).jti;
        expect(jti1).not.toBe(jti2);
    });

    it('uses the JWT_REFRESH_EXPIRY env var (defaults to 7d)', () => {
        const token   = generateRefreshToken(SAMPLE_PAYLOAD);
        const decoded = jwt.decode(token);
        const ttl = decoded.exp - decoded.iat;
        const sevenDaysInSeconds = 7 * 24 * 60 * 60; // 604800
        expect(ttl).toBeLessThanOrEqual(sevenDaysInSeconds);
        expect(ttl).toBeGreaterThan(sevenDaysInSeconds - 60);
    });
});

// ---------------------------------------------------------------------------
// generateTokenPair
// ---------------------------------------------------------------------------

describe('generateTokenPair', () => {
    it('returns an object with accessToken and refreshToken', () => {
        const pair = generateTokenPair(SAMPLE_PAYLOAD);
        expect(pair).toHaveProperty('accessToken');
        expect(pair).toHaveProperty('refreshToken');
    });

    it('both tokens are valid JWTs', () => {
        const { accessToken, refreshToken } = generateTokenPair(SAMPLE_PAYLOAD);
        expect(accessToken.split('.')).toHaveLength(3);
        expect(refreshToken.split('.')).toHaveLength(3);
    });

    it('accessToken is verifiable with access secret', () => {
        const { accessToken } = generateTokenPair(SAMPLE_PAYLOAD);
        expect(() => jwt.verify(accessToken, ACCESS_SECRET)).not.toThrow();
    });

    it('refreshToken is verifiable with refresh secret', () => {
        const { refreshToken } = generateTokenPair(SAMPLE_PAYLOAD);
        expect(() => jwt.verify(refreshToken, REFRESH_SECRET)).not.toThrow();
    });

    it('refreshToken has a jti; accessToken does not', () => {
        const { accessToken, refreshToken } = generateTokenPair(SAMPLE_PAYLOAD);
        expect(jwt.decode(refreshToken).jti).toBeDefined();
        expect(jwt.decode(accessToken).jti).toBeUndefined();
    });

    it('tokens are cross-secret incompatible', () => {
        const { accessToken, refreshToken } = generateTokenPair(SAMPLE_PAYLOAD);
        expect(() => jwt.verify(accessToken,  REFRESH_SECRET)).toThrow();
        expect(() => jwt.verify(refreshToken, ACCESS_SECRET)).toThrow();
    });

    it('generates fresh unique jtis on each call', () => {
        const pair1 = generateTokenPair(SAMPLE_PAYLOAD);
        const pair2 = generateTokenPair(SAMPLE_PAYLOAD);
        const jti1 = jwt.decode(pair1.refreshToken).jti;
        const jti2 = jwt.decode(pair2.refreshToken).jti;
        expect(jti1).not.toBe(jti2);
    });
});

// ---------------------------------------------------------------------------
// verifyAccessToken
// ---------------------------------------------------------------------------

describe('verifyAccessToken', () => {
    it('returns the decoded payload for a valid token', () => {
        const token   = generateAccessToken(SAMPLE_PAYLOAD);
        const decoded = verifyAccessToken(token);
        expect(decoded.id).toBe(SAMPLE_PAYLOAD.id);
        expect(decoded.email).toBe(SAMPLE_PAYLOAD.email);
    });

    it('throws JsonWebTokenError for a tampered token', () => {
        const token   = generateAccessToken(SAMPLE_PAYLOAD);
        const tampered = token.slice(0, -5) + 'xxxxx';
        expect(() => verifyAccessToken(tampered)).toThrow(jwt.JsonWebTokenError);
    });

    it('throws JsonWebTokenError for a token signed with the wrong secret', () => {
        const wrongToken = jwt.sign(SAMPLE_PAYLOAD, 'wrong-secret');
        expect(() => verifyAccessToken(wrongToken)).toThrow(jwt.JsonWebTokenError);
    });

    it('throws TokenExpiredError for an expired token', () => {
        const expired = jwt.sign(SAMPLE_PAYLOAD, ACCESS_SECRET, { expiresIn: -1 });
        expect(() => verifyAccessToken(expired)).toThrow(jwt.TokenExpiredError);
    });

    it('throws for a refresh token passed as access token', () => {
        const refreshToken = generateRefreshToken(SAMPLE_PAYLOAD);
        expect(() => verifyAccessToken(refreshToken)).toThrow();
    });
});

// ---------------------------------------------------------------------------
// verifyRefreshToken
// ---------------------------------------------------------------------------

describe('verifyRefreshToken', () => {
    it('returns the decoded payload including jti', () => {
        const token   = generateRefreshToken(SAMPLE_PAYLOAD);
        const decoded = verifyRefreshToken(token);
        expect(decoded.id).toBe(SAMPLE_PAYLOAD.id);
        expect(decoded.jti).toBeDefined();
    });

    it('throws JsonWebTokenError for a tampered token', () => {
        const token   = generateRefreshToken(SAMPLE_PAYLOAD);
        const tampered = token.slice(0, -5) + 'xxxxx';
        expect(() => verifyRefreshToken(tampered)).toThrow(jwt.JsonWebTokenError);
    });

    it('throws JsonWebTokenError for a token signed with the wrong secret', () => {
        const wrongToken = jwt.sign(SAMPLE_PAYLOAD, 'wrong-secret');
        expect(() => verifyRefreshToken(wrongToken)).toThrow(jwt.JsonWebTokenError);
    });

    it('throws TokenExpiredError for an expired token', () => {
        const expired = jwt.sign(
            { ...SAMPLE_PAYLOAD, jti: 'test-jti' },
            REFRESH_SECRET,
            { expiresIn: -1 }
        );
        expect(() => verifyRefreshToken(expired)).toThrow(jwt.TokenExpiredError);
    });

    it('throws for an access token passed as refresh token', () => {
        const accessToken = generateAccessToken(SAMPLE_PAYLOAD);
        expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
});

// ---------------------------------------------------------------------------
// Guard — module throws if secrets are missing
// ---------------------------------------------------------------------------

describe('module startup guard', () => {
    it('throws if JWT_ACCESS_SECRET is absent', async () => {
        const saved = process.env.JWT_ACCESS_SECRET;
        delete process.env.JWT_ACCESS_SECRET;

        // Force a fresh module load by importing with a cache-busting trick.
        // In Jest ESM, we re-import with a query param to bypass the cache.
        await expect(
            import(`../../core/services/jwt.service.js?bust=${Date.now()}`)
        ).rejects.toThrow('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in .env');

        process.env.JWT_ACCESS_SECRET = saved;
    });
});