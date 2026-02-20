import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRY  = process.env.JWT_ACCESS_EXPIRY  || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in .env');
}

// ── Individual token generators ───────────────────────────────────────────────

export const generateAccessToken = (payload) =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });

export const generateRefreshToken = (payload) =>
  jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );

// ── Pair generator — must come AFTER the two above ───────────────────────────

export const generateTokenPair = (payload) => ({
  accessToken:  generateAccessToken(payload),
  refreshToken: generateRefreshToken(payload),
});

// ── Verifiers ─────────────────────────────────────────────────────────────────

export const verifyAccessToken  = (token) => jwt.verify(token, ACCESS_SECRET);
export const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_SECRET);