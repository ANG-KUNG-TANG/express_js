import passport from 'passport';
import { generateTokenPair, verifyRefreshToken } from '../../core/services/jwt.service.js';
import {
  saveRefreshToken,
  revokeRefreshToken,
  isRefreshTokenValid,
  revokeAllForUser,
} from '../../core/services/token_store.service.js';
import { authenticateUserUseCase } from '../../app/user_uc/auth_user.uc.js';
import { createUserUsecase } from '../../app/user_uc/create_user.uc.js';
import { sanitizeAuthInput, sanitizeCreateInput } from '../input_sanitizers/user.input_sanitizer.js';
import { sendSuccess } from '../response_formatter.js';
import { HTTP_STATUS } from '../http_status.js';
import logger from '../../core/logger/logger.js';
// ── CHANGED: replaced direct auditLogger import with service + enum ──────────
import { recordAudit, recordFailure } from '../../core/services/audit.service.js';
import { AuditAction } from '../../domain/base/audit_enums.js';

// ---------------------------------------------------------------------------
// Cookie config
// ---------------------------------------------------------------------------

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax',
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
// Login  (POST /auth/login)
// ---------------------------------------------------------------------------

export const loginUser = async (req, res) => {
  const input = sanitizeAuthInput(req.body);

  logger.debug('auth.loginUser called', { requestId: req.id, email: input.email });

  // ── CHANGED: wrap UC call to catch and audit login failures ─────────────
  let user;
  try {
    user = await authenticateUserUseCase(input);
  } catch (err) {
    recordFailure(AuditAction.AUTH_LOGIN, null, {
      email:  input.email,
      reason: err.message,
    }, req);
    throw err; // re-throw so error handler sends the response
  }

  const { accessToken } = issueTokens(res, user);

  // ── CHANGED: recordAudit via service, using AuditAction enum ────────────
  recordAudit(AuditAction.AUTH_LOGIN, user.id ?? user._id, {
    email: user.email ?? user._email,
    role:  user.role  ?? user._role,
  }, req);

  return sendSuccess(res, {
    token: accessToken,
    user: {
      id:    user.id    ?? user._id,
      email: user.email ?? user._email,
      role:  user.role  ?? user._role,
      name:  user.name  ?? user._name,
    },
  }, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// Register  (POST /auth/register)
// ---------------------------------------------------------------------------

export const registerUser = async (req, res) => {
  const input = sanitizeCreateInput(req.body);

  logger.debug('auth.registerUser called', { requestId: req.id, email: input.email });

  const user = await createUserUsecase(input);
  const { accessToken } = issueTokens(res, user);

  // ── CHANGED: 'auth.register' was an unregistered string; now USER_CREATED ──
  recordAudit(AuditAction.USER_CREATED, user.id ?? user._id, {
    email: user.email ?? user._email,
    role:  user.role  ?? user._role,
  }, req);

  return sendSuccess(res, {
    token: accessToken,
    user: {
      id:    user.id    ?? user._id,
      email: user.email ?? user._email,
      role:  user.role  ?? user._role,
      name:  user.name  ?? user._name,
    },
  }, HTTP_STATUS.CREATED);
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
    passport.authenticate(provider, {
      session: false,
      failureRedirect: '/pages/auth/auth_fail.html?message=Authentication+failed'
    })(req, res, next),
  (req, res) => {
    const tokens = issueTokens(res, req.user);

    logger.debug(`auth.oauthCallback: ${provider} login successful`, {
      requestId: req.id,
      userId: req.user?.id,
      provider,
    });

    // ── CHANGED: derive correct enum per provider instead of raw template string ──
    const oauthAction =
      provider === 'google' ? AuditAction.AUTH_OAUTH_LOGIN_GOOGLE
                            : AuditAction.AUTH_OAUTH_LOGIN_GITHUB;

    recordAudit(oauthAction, req.user?.id, {
      email:    req.user?._email ?? req.user?.email,
      provider,
    }, req);

    const userBase64 = Buffer.from(JSON.stringify(req.user)).toString('base64');
    const successUrl = `/pages/auth/auth_success.html?token=${tokens.accessToken}&user=${userBase64}`;
    return res.redirect(successUrl);
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
    // ── CHANGED: AUTH_TOKEN_REFRESH_FAILED replaces raw 'auth.token.refresh' ──
    recordFailure(AuditAction.AUTH_TOKEN_REFRESH_FAILED, null, { reason: 'no_token' }, req);
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
    recordFailure(AuditAction.AUTH_TOKEN_REFRESH_FAILED, null, { reason: 'invalid_or_expired' }, req);
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: 'Invalid or expired refresh token' });
  }

  if (!isRefreshTokenValid(decoded.jti)) {
    revokeAllForUser(decoded.id);
    logger.warn('auth.refreshTokens: refresh token reuse detected — all sessions revoked', {
      requestId: req.id,
      userId: decoded.id,
    });
    // ── CHANGED: AUTH_TOKEN_REUSE_DETECTED replaces raw 'auth.token.reuse_detected' ──
    recordFailure(AuditAction.AUTH_TOKEN_REUSE_DETECTED, decoded.id, {
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
  // ── CHANGED: AUTH_TOKEN_REFRESHED replaces raw 'auth.token.refreshed' ───
  recordAudit(AuditAction.AUTH_TOKEN_REFRESHED, decoded.id, {}, req);

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
      logger.warn('auth.logout: could not verify refresh token on logout', { requestId: req.id });
    }
  }

  res.clearCookie('refreshToken');

  logger.debug('auth.logout: user logged out', { requestId: req.id, userId });
  // ── CHANGED: AUTH_LOGOUT replaces raw 'auth.logout' ─────────────────────
  recordAudit(AuditAction.AUTH_LOGOUT, userId, {}, req);

  return sendSuccess(res, { message: 'Logged out successfully' }, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// Failure fallback  (GET /auth/failure)
// ---------------------------------------------------------------------------

export const authFailure = (req, res) => {
  logger.warn('auth.authFailure: OAuth authentication failed', { requestId: req.id });
  // ── CHANGED: AUTH_OAUTH_FAILURE replaces raw 'auth.oauth.failure' ────────
  recordFailure(AuditAction.AUTH_OAUTH_FAILURE, null, { reason: 'oauth_provider_rejected' }, req);
  return res.redirect('/pages/auth/auth_fail.html?message=OAuth+authentication+failed');
};