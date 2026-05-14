// src/controllers/auth.controller.js
import passport from 'passport';
import { sanitizeAuthInput, sanitizeCreateInput } from '../input_sanitizers/user.input_sanitizer.js';
import { sendSuccess } from '../response_formatter.js';
import { HTTP_STATUS } from '../http_status.js';
import logger from '../../core/logger/logger.js';
import { recordAudit } from '../../core/services/audit.service.js';
import { AuditAction } from '../../domain/base/audit_enums.js';
import { authenticateUserUseCase } from '../../app/user_uc/auth_user.uc.js';
import { createUserUsecase } from '../../app/user_uc/create_user.uc.js';
import * as authService from '../../core/services/auth.service.js';

// ---------------------------------------------------------------------------
// Login  (POST /auth/login)
// ---------------------------------------------------------------------------
export const loginUser = async (req, res) => {
  const input = sanitizeAuthInput(req.body);
  logger.debug('auth.loginUser called', { requestId: req.id, email: input.email });

  const user = await authenticateUserUseCase(input, req);
  const { accessToken } = await authService.createSession(res, user, req);

  return sendSuccess(res, {
    token: accessToken,
    user: {
      id: user.id ?? user._id,
      email: user.email ?? user._email,
      role: user.role ?? user._role,
      name: user.name ?? user._name,
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
  const { accessToken } = await authService.createSession(res, user);

  recordAudit(AuditAction.USER_CREATED, user.id ?? user._id, {
    email: user.email ?? user._email,
    role: user.role ?? user._role,
  }, req);

  return sendSuccess(res, {
    token: accessToken,
    user: {
      id: user.id ?? user._id,
      email: user.email ?? user._email,
      role: user.role ?? user._role,
      name: user.name ?? user._name,
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
      failureRedirect: '/pages/auth/auth_fail.html?message=Authentication+failed',
    })(req, res, next),

  async (req, res) => {
    // Create session (tokens + cookie) via the service
    const { accessToken } = await authService.createSession(res, req.user, req);

    logger.debug(`auth.oauthCallback: ${provider} login successful`, {
      requestId: req.id,
      userId: req.user?.id,
      provider,
    });

    // Build safe user object for frontend (no sensitive data)
    const safeUser = {
      id: req.user.id ?? req.user._id,
      email: req.user.email ?? req.user._email,
      role: req.user.role ?? req.user._role,
      name: req.user.name ?? req.user._name,
    };

    const userBase64 = Buffer.from(JSON.stringify(safeUser)).toString('base64');
    const successUrl = `/pages/auth/auth_success.html?token=${accessToken}&user=${userBase64}`;
    return res.redirect(successUrl);
  },
];

export const googleCallback = oauthCallback('google');
export const githubCallback = oauthCallback('github');

// ---------------------------------------------------------------------------
// Refresh  (POST /auth/refresh)
// ---------------------------------------------------------------------------
export const refreshTokens = async (req, res) => {
  try {
    const { accessToken } = await authService.rotateSession(req, res);
    return sendSuccess(res, { accessToken }, HTTP_STATUS.OK);
  } catch (err) {
    switch (err.message) {
      case 'NO_TOKEN':
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: 'No refresh token provided' });
      case 'INVALID_OR_EXPIRED':
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: 'Invalid or expired refresh token' });
      case 'REUSE_DETECTED':
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: 'Refresh token reuse detected' });
      default:
        logger.error('auth.refreshTokens: unexpected error', { requestId: req.id, error: err });
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Internal server error' });
    }
  }
};

// ---------------------------------------------------------------------------
// Logout  (POST /auth/logout)
// ---------------------------------------------------------------------------
export const logout = async (req, res) => {
  await authService.revokeSession(req, res);
  return sendSuccess(res, { message: 'Logged out successfully' }, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// Failure fallback  (GET /auth/failure)
// ---------------------------------------------------------------------------
export const authFailure = (req, res) => {
  logger.warn('auth.authFailure: OAuth authentication failed', { requestId: req.id });
  // The service could be extended to record failures, but keeping minimal here
  return res.redirect('/pages/auth/auth_fail.html?message=OAuth+authentication+failed');
};