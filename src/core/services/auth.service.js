// src/services/auth.service.js
import crypto from 'crypto';
import { generateTokenPair, verifyRefreshToken } from '../../core/services/jwt.service.js';
import {
  saveRefreshToken,
  revokeRefreshToken,
  isRefreshTokenValid,
  revokeAllForUser,
} from '../../core/services/token_store.service.js';
import { recordAudit, recordFailure } from '../../core/services/audit.service.js';
import { AuditAction } from '../../domain/base/audit_enums.js';
import logger from '../../core/logger/logger.js';
import {
  ACCESS_COOKIE_MAX_AGE_MS,
  REFRESH_COOKIE_MAX_AGE_MS,
} from '../../domain/base/token_ttl.js';

// ── Cookie configuration ───────────────────────────────────────────────────
const IS_PROD = process.env.NODE_ENV === 'production';

const COOKIE_BASE = {
  httpOnly: true,
  secure:   IS_PROD,
  sameSite: 'strict',
};

// REMOVED: ACCESS_COOKIE_OPTIONS
// access token is returned in the response body only — never stored in a cookie.
// The authenticate middleware reads it from the Authorization: Bearer header.
// Storing it in a cookie duplicates it unnecessarily and caused the extra
// 'access_token' cookie showing up in Postman.

const REFRESH_COOKIE_OPTIONS = {
  ...COOKIE_BASE,
  maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  path:   '/api/auth',  // scoped — only sent to auth routes, not every request
};

// REMOVED: CSRF_COOKIE_OPTIONS + manual csrfToken generation
// csrf-csrf handles its own cookie (x-csrf-token) via generateCsrfToken()
// and csrfMiddleware. A separate hand-rolled csrf_token cookie conflicts
// with it and was causing the duplicate/stale csrf_token cookie in Postman.

// ── Cookie helpers ─────────────────────────────────────────────────────────

/**
 * Set only the refresh_token httpOnly cookie.
 * Access token goes in the response body — NOT a cookie.
 * CSRF cookie is managed entirely by csrf-csrf middleware.
 */
export function setAuthCookies(res, refreshToken) {
  res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
}

/**
 * Clear all auth cookies on logout.
 * x-csrf-token is NOT cleared here — it's stateless and expires naturally.
 * Clearing it would break the next CSRF token fetch.
 */
export function clearAuthCookies(res) {
  res.clearCookie('refresh_token', { path: '/api/auth' });
}

// ── Session management ─────────────────────────────────────────────────────

/**
 * Issue new access & refresh tokens, store refresh token, set httpOnly cookie.
 * Returns accessToken for the controller to send in the response body.
 *
 * @param {object} res   - Express response
 * @param {object} user  - User entity { id/_id, email/_email, role/_role }
 * @param {object} [req] - Optional, used for audit logging
 * @returns {Promise<{ accessToken: string }>}
 */
export async function createSession(res, user, req = null) {
  const payload = {
    id:    user.id    ?? user._id,
    email: user.email ?? user._email,
    role:  user.role  ?? user._role,
  };

  const { accessToken, refreshToken, jti } = generateTokenPair(payload);

  await saveRefreshToken(payload.id, jti);
  setAuthCookies(res, refreshToken);  // only refresh_token cookie

  logger.debug('auth.service: session created', {
    requestId: req?.id,
    userId:    payload.id,
  });

  return { accessToken };  // controller puts this in the response body
}

/**
 * Rotate refresh token pair — validate old token, detect reuse, issue new pair.
 *
 * @param {object} req - Express request (reads refresh_token cookie)
 * @param {object} res - Express response (sets new cookie)
 * @returns {Promise<{ accessToken: string }>}
 * @throws {Error} 'NO_TOKEN' | 'INVALID_OR_EXPIRED' | 'REUSE_DETECTED'
 */
export async function rotateSession(req, res) {
  const token = req.cookies?.refresh_token;

  if (!token) {
    logger.warn('auth.service: no refresh token', { requestId: req.id });
    recordFailure(AuditAction.AUTH_TOKEN_REFRESH_FAILED, null, { reason: 'no_token' }, req);
    throw new Error('NO_TOKEN');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (err) {
    logger.warn('auth.service: invalid refresh token', { requestId: req.id, error: err.message });
    recordFailure(AuditAction.AUTH_TOKEN_REFRESH_FAILED, null, { reason: 'invalid_or_expired' }, req);
    clearAuthCookies(res);
    throw new Error('INVALID_OR_EXPIRED');
  }

  // Reuse detection — if token is no longer valid in the store, revoke everything
  if (!await isRefreshTokenValid(decoded.id, decoded.jti)) {
    await revokeAllForUser(decoded.id);
    logger.warn('auth.service: refresh token reuse detected', {
      requestId: req.id,
      userId:    decoded.id,
    });
    recordFailure(AuditAction.AUTH_TOKEN_REUSE_DETECTED, decoded.id, {
      action: 'all_sessions_revoked',
    }, req);
    clearAuthCookies(res);
    throw new Error('REUSE_DETECTED');
  }

  // Valid — revoke old token, issue new pair
  const payload = { id: decoded.id, email: decoded.email, role: decoded.role };
  const { accessToken, refreshToken: newRefresh } = generateTokenPair(payload);
  const newDecoded = verifyRefreshToken(newRefresh);

  await revokeRefreshToken(decoded.id, decoded.jti);  // revoke old
  await saveRefreshToken(decoded.id, newDecoded.jti);  // save new

  setAuthCookies(res, newRefresh);

  logger.debug('auth.service: token pair rotated', { requestId: req.id, userId: decoded.id });
  recordAudit(AuditAction.AUTH_TOKEN_REFRESHED, decoded.id, {}, req);

  return { accessToken };
}

/**
 * Revoke the current refresh token and clear cookies.
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @returns {Promise<{ userId: string|null }>}
 */
export async function revokeSession(req, res) {
  const token = req.cookies?.refresh_token;
  let userId = null;

  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      userId = decoded.id;
      await revokeRefreshToken(decoded.id, decoded.jti);
    } catch (err) {
      // Token already expired or invalid — still clear the cookie
      logger.warn('auth.service: could not verify token on logout', {
        requestId: req.id,
        error:     err.message,
      });
    }
  }

  clearAuthCookies(res);

  logger.debug('auth.service: session revoked', { requestId: req.id, userId });
  recordAudit(AuditAction.AUTH_LOGOUT, userId, {}, req);

  return { userId };
}

/**
 * Revoke all sessions for a user (admin action or reuse detection).
 *
 * @param {string} userId
 */
export async function revokeAllUserSessions(userId) {
  await revokeAllForUser(userId);
  logger.debug('auth.service: all sessions revoked for user', { userId });
}