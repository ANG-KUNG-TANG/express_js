import { Router } from 'express';
import { asyncHandler } from '../async_handler.js';
import { authLimiter } from '../../middleware/rate_limit.middleware.js';
import {
  googleAuth,
  googleCallback,
  githubAuth,
  githubCallback,
  refreshTokens,
  loginUser,
  registerUser,
  logout,
  authFailure,
} from '../table/auth.controller.js';

const router = Router();

// ── OAuth initiators ─────────────────────────────────────────────────────────
router.get('/google',          googleAuth);
router.get('/github',          githubAuth);

// ── OAuth callbacks ──────────────────────────────────────────────────────────
router.get('/google/callback', ...googleCallback);
router.get('/github/callback', ...githubCallback);

// ── Token management ─────────────────────────────────────────────────────────
router.post('/refresh',        authLimiter, asyncHandler(refreshTokens));
router.post('/register',       authLimiter, asyncHandler(registerUser));
router.post('/login',          authLimiter, asyncHandler(loginUser));
router.post('/logout',         authLimiter, asyncHandler(logout));

// ── Failure fallback ─────────────────────────────────────────────────────────
router.get('/failure',         authFailure);

export default router;

