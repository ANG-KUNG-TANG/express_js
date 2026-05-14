// src/services/auth.service.js
import { generateTokenPair, verifyRefreshToken } from '../../core/services/jwt.service.js';
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

// Cookie configuration
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Issue new access & refresh tokens, store refresh token, and set HTTP‑only cookie.
 * @param {object} res - Express response object (to set cookie)
 * @param {object} user - User object with id, email, role
 * @param {object} [req] - Optional request object for audit logging
 * @returns {Promise<{accessToken: string}>}
 */
export async function createSession(res, user, req = null) {
  const payload = {
    id: user.id ?? user._id,
    email: user.email ?? user._email,
    role: user.role ?? user._role,
  };
  const { accessToken, refreshToken } = generateTokenPair(payload);

  const decoded = verifyRefreshToken(refreshToken);
  saveRefreshToken(decoded.jti, payload.id);

  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

  if (req) {
    logger.debug('auth.service: session created', { requestId: req.id, userId: payload.id });
    recordAudit(AuditAction.AUTH_LOGIN_SUCCESS, payload.id, { provider: 'local' }, req);
  }

  return { accessToken };
}

/**
 * Rotate refresh token pair, validate old token, detect reuse.
 * @param {object} req - Express request object (to read cookie)
 * @param {object} res - Express response object (to set/clear cookies)
 * @returns {Promise<{accessToken: string}>}
 * @throws {Error} With message 'NO_TOKEN', 'INVALID_OR_EXPIRED', or 'REUSE_DETECTED'
 */
export async function rotateSession(req, res) {
  const token = req.cookies?.refreshToken;

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
    res.clearCookie('refreshToken');
    throw new Error('INVALID_OR_EXPIRED');
  }

  // Check if token is still valid (not revoked)
  if (!isRefreshTokenValid(decoded.jti)) {
    // Reuse detected – revoke all sessions for this user
    revokeAllForUser(decoded.id);
    logger.warn('auth.service: refresh token reuse detected', {
      requestId: req.id,
      userId: decoded.id,
    });
    recordFailure(AuditAction.AUTH_TOKEN_REUSE_DETECTED, decoded.id, {
      action: 'all_sessions_revoked',
    }, req);
    res.clearCookie('refreshToken');
    throw new Error('REUSE_DETECTED');
  }

  // Valid token – revoke the old one and issue a new pair
  revokeRefreshToken(decoded.jti);

  const payload = { id: decoded.id, email: decoded.email, role: decoded.role };
  const { accessToken, refreshToken: newRefresh } = generateTokenPair(payload);
  const newDecoded = verifyRefreshToken(newRefresh);
  saveRefreshToken(newDecoded.jti, decoded.id);

  res.cookie('refreshToken', newRefresh, REFRESH_COOKIE_OPTIONS);

  logger.debug('auth.service: token pair rotated', { requestId: req.id, userId: decoded.id });
  recordAudit(AuditAction.AUTH_TOKEN_REFRESHED, decoded.id, {}, req);

  return { accessToken };
}

/**
 * Revoke the current refresh token and clear the cookie.
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @returns {Promise<{userId: string|null}>}
 */
export async function revokeSession(req, res) {
  const token = req.cookies?.refreshToken;
  let userId = null;

  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      userId = decoded.id;
      revokeRefreshToken(decoded.jti);
    } catch (err) {
      logger.warn('auth.service: could not verify token on logout', { requestId: req.id, error: err.message });
    }
  }

  res.clearCookie('refreshToken');
  logger.debug('auth.service: session revoked', { requestId: req.id, userId });
  recordAudit(AuditAction.AUTH_LOGOUT, userId, {}, req);

  return { userId };
}

/**
 * Revoke all sessions for a user (used after reuse detection).
 * @param {string} userId
 */
export function revokeAllUserSessions(userId) {
  revokeAllForUser(userId);
  logger.debug('auth.service: all sessions revoked for user', { userId });
}