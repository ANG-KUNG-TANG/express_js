import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRY  = process.env.JWT_ACCESS_EXPIRY  || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in .env');
}

// ── TTL helper ────────────────────────────────────────────────────────────────
// parseTtl('15m') -> 900 (seconds)
// parseTtl('7d')  -> 604800 (seconds)

export const parseTtl = (str) => {
  const unit = str.slice(-1);
  const val  = parseInt(str, 10);
  const map  = { s: 1, m: 60, h: 3600, d: 86400 };
  // FIX: was using single-quoted template literal — `${str}` never interpolated
  if (isNaN(val) || !(unit in map)) throw new Error(`[jwt.service] invalid TTL format: ${str}`);
  return map[unit] * val;
};

export const ACCESS_TTL_SEC  = parseTtl(ACCESS_EXPIRY);
export const REFRESH_TTL_SEC = parseTtl(REFRESH_EXPIRY);

// ── Individual token generators ───────────────────────────────────────────────

export const generateAccessToken = (payload) =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });

export const generateRefreshToken = (payload) => {
  const jti = crypto.randomUUID();
  // FIX: was `toke` — typo meant the returned field was undefined when
  // destructured as `{ token: refreshToken }` in generateTokenPair
  const token = jwt.sign({ ...payload, jti }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
  return { token, jti };
};

// Convenience: generate both at once.
// Returns { accessToken, refreshToken, jti }
export const generateTokenPair = (payload) => {
  const accessToken = generateAccessToken(payload);
  const { token: refreshToken, jti } = generateRefreshToken(payload);
  return { accessToken, refreshToken, jti };
};

// ── Verifiers ─────────────────────────────────────────────────────────────────

export const verifyAccessToken  = (token) => jwt.verify(token, ACCESS_SECRET);
export const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_SECRET);

// ── Cookie helpers ────────────────────────────────────────────────────────────

const BASE_COOKIE_OPTS = {
  httpOnly: true,
  // FIX: was bare `NODE_ENV` — ReferenceError at startup; must be process.env.NODE_ENV
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax',
};

export const setAuthCookies = (res, accessToken, refreshToken) => {
  // FIX: was `res.cookie('access_token', accessToken {` — missing comma before options object
  res.cookie('access_token', accessToken, {
    ...BASE_COOKIE_OPTS,
    maxAge: ACCESS_TTL_SEC * 1000,
    path:   '/',
  });

  res.cookie('refresh_token', refreshToken, {
    ...BASE_COOKIE_OPTS,
    maxAge: REFRESH_TTL_SEC * 1000,
    path:   '/api/auth',
  });
};

export const clearAuthCookies = (res) => {
  res.clearCookie('access_token',  { path: '/' });
  res.clearCookie('refresh_token', { path: '/api/auth' });
};