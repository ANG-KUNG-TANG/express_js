import { Router } from 'express';
import { asyncHandler } from '../async_handler.js';
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
router.post('/refresh',        asyncHandler(refreshTokens));
router.post('/register',       asyncHandler(registerUser));
router.post('/login',          asyncHandler(loginUser));
router.post('/logout',         asyncHandler(logout));

// ── Failure fallback ─────────────────────────────────────────────────────────
router.get('/failure',         authFailure);

export default router;