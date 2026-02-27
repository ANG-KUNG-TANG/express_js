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
import logger from '../../core/logger/logger.js';
import auditLogger from '../../core/logger/audit.logger.js';

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

// ---------------------------------------------------------------------------
// OAuth initiators
// ---------------------------------------------------------------------------

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

    logger.debug(`auth.oauthCallback: ${provider} login successful`, {
      requestId: req.id,
      userId: req.user?.id,
      provider,
    });

    auditLogger.log(`auth.oauth.login.${provider}`, {
      userId: req.user?.id,
      email: req.user?._email ?? req.user?.email,
      provider,
    }, req);

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
    logger.warn('auth.refreshTokens: no refresh token in cookie', { requestId: req.id });
    auditLogger.failure('auth.token.refresh', { reason: 'no_token' }, req);
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: 'No refresh token provided' });
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (err) {
    logger.warn('auth.refreshTokens: invalid or expired refresh token', {
      requestId: req.id,
      error: err.message,
    });
    auditLogger.failure('auth.token.refresh', { reason: 'invalid_or_expired' }, req);
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: 'Invalid or expired refresh token' });
  }

  if (!isRefreshTokenValid(decoded.jti)) {
    // Token reuse detected — security event, kill all sessions for this user
    revokeAllForUser(decoded.id);
    logger.warn('auth.refreshTokens: refresh token reuse detected — all sessions revoked', {
      requestId: req.id,
      userId: decoded.id,
    });
    auditLogger.failure('auth.token.reuse_detected', {
      userId: decoded.id,
      action: 'all_sessions_revoked',
    }, req);
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: 'Refresh token reuse detected' });
  }

  revokeRefreshToken(decoded.jti);

  const payload = { id: decoded.id, email: decoded.email, role: decoded.role };
  const { accessToken, refreshToken: newRefresh } = generateTokenPair(payload);

  const newDecoded = verifyRefreshToken(newRefresh);
  saveRefreshToken(newDecoded.jti, decoded.id);

  res.cookie('refreshToken', newRefresh, REFRESH_COOKIE_OPTIONS);

  logger.debug('auth.refreshTokens: token pair rotated', { requestId: req.id, userId: decoded.id });
  auditLogger.log('auth.token.refreshed', { userId: decoded.id }, req);

  return sendSuccess(res, { accessToken }, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// Logout  (POST /auth/logout)
// ---------------------------------------------------------------------------

export const logout = (req, res) => {
  const token = req.cookies?.refreshToken;
  let userId = null;

  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      userId = decoded.id;
      revokeRefreshToken(decoded.jti);
    } catch {
      // Token already expired or invalid — still clear the cookie
      logger.warn('auth.logout: could not verify refresh token on logout', { requestId: req.id });
    }
  }

  res.clearCookie('refreshToken');

  logger.debug('auth.logout: user logged out', { requestId: req.id, userId });
  auditLogger.log('auth.logout', { userId }, req);

  return sendSuccess(res, { message: 'Logged out successfully' }, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// Failure fallback  (GET /auth/failure)
// ---------------------------------------------------------------------------

export const authFailure = (req, res) => {
  logger.warn('auth.authFailure: OAuth authentication failed', { requestId: req.id });
  auditLogger.failure('auth.oauth.failure', { reason: 'oauth_provider_rejected' }, req);
  return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: 'OAuth authentication failed' });
};