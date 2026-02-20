import passport from 'passport';
import { generateTokenPair, verifyRefreshToken } from '../../core/services/jwt.service.js';
import {
  saveRefreshToken,
  revokeRefreshToken,
  isRefreshTokenValid,
  revokeAllForUser,
} from '../../core/services/token_store.service.js';
import { sendSuccess } from '../response_formatter.js';
import { HTTP_STATUS } from '../http_status.js';

// ---------------------------------------------------------------------------
// Cookie config
// ---------------------------------------------------------------------------

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const issueTokens = (res, user) => {
  const payload = { id: user.id, email: user._email ?? user.email, role: user._role ?? user.role };
  const { accessToken, refreshToken } = generateTokenPair(payload);

  const decoded = verifyRefreshToken(refreshToken);
  saveRefreshToken(decoded.jti, user.id);

  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  return { accessToken };
};


export const googleAuth = (req, res, next) =>
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);

export const githubAuth = (req, res, next) =>
  passport.authenticate('github', { scope: ['user:email'], session: false })(req, res, next);

// ---------------------------------------------------------------------------
// OAuth callbacks  (GET /auth/google/callback  |  GET /auth/github/callback)
// ---------------------------------------------------------------------------

const oauthCallback = (provider) => [
  (req, res, next) =>
    passport.authenticate(provider, { session: false, failureRedirect: '/auth/failure' })(req, res, next),
  (req, res) => {
    const tokens = issueTokens(res, req.user);
    return sendSuccess(res, tokens, HTTP_STATUS.OK);
  },
];

export const googleCallback = oauthCallback('google');
export const githubCallback = oauthCallback('github');

// ---------------------------------------------------------------------------
// Refresh  (POST /auth/refresh)
// ---------------------------------------------------------------------------

export const refreshTokens = (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: 'No refresh token provided' });
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: 'Invalid or expired refresh token' });
  }

  if (!isRefreshTokenValid(decoded.jti)) {
    revokeAllForUser(decoded.id); // Token reuse — kill all sessions
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: 'Refresh token reuse detected' });
  }

  revokeRefreshToken(decoded.jti);

  const payload = { id: decoded.id, email: decoded.email, role: decoded.role };
  const { accessToken, refreshToken: newRefresh } = generateTokenPair(payload);

  const newDecoded = verifyRefreshToken(newRefresh);
  saveRefreshToken(newDecoded.jti, decoded.id);

  res.cookie('refreshToken', newRefresh, REFRESH_COOKIE_OPTIONS);
  return sendSuccess(res, { accessToken }, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// Logout  (POST /auth/logout)
// ---------------------------------------------------------------------------

export const logout = (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      revokeRefreshToken(decoded.jti);
    } catch {
        
    }
  }
  res.clearCookie('refreshToken');
  return sendSuccess(res, { message: 'Logged out successfully' }, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// Failure fallback  (GET /auth/failure)
// ---------------------------------------------------------------------------

export const authFailure = (_req, res) =>
  res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: 'OAuth authentication failed' });