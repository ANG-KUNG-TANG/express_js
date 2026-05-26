import { Router }       from 'express';
import { asyncHandler } from '../async_handler.js';
import {
    loginRateLimit,
    registerRateLimit,
    refreshRateLimit,
    passwordResetRateLimit,
    emailVerifyRateLimit,
    oauthRateLimit,
} from '../../middleware/rate_limit.middleware.js';
import {
    googleAuth,
    googleCallback,
    githubAuth,
    githubCallback,
    refreshTokens,
    loginUser,
    registerUser,
    logout,
    verifyEmail,
    resendVerification,
    authFailure,
} from '../table/auth.controller.js';
import { authenticate }                  from '../../middleware/authenticate.middelware.js';
import { generateCsrfToken, csrfMiddleware } from '../../middleware/csrf.middleware.js';

const router = Router();

// ── CSRF token — must be called FIRST to set the cookie + return the token ────
// Frontend calls GET /api/auth/csrf-token, stores the returned token, then
// includes it as the x-csrf-token header on all state-changing requests.
router.get('/csrf-token', (req, res) => {
    const token = generateCsrfToken(req, res); // both req AND res are required
    res.json({ csrfToken: token });
});

// ── OAuth initiators ──────────────────────────────────────────────────────────
router.get('/google', oauthRateLimit, googleAuth);
router.get('/github', oauthRateLimit, githubAuth);

// ── OAuth callbacks ───────────────────────────────────────────────────────────
router.get('/google/callback', ...googleCallback);
router.get('/github/callback', ...githubCallback);

// ── Local auth ────────────────────────────────────────────────────────────────
// register & login are entry points — protected by rate limit, NOT CSRF.
// (Users have no token yet; CSRF here would be a chicken-and-egg problem.)
router.post('/register', registerRateLimit, asyncHandler(registerUser));
router.post('/login',    loginRateLimit,    asyncHandler(loginUser));

// logout IS csrf-protected — requires token from /csrf-token + valid session.
router.post('/logout',   csrfMiddleware, authenticate, asyncHandler(logout));

// ── Token rotation ────────────────────────────────────────────────────────────
router.post('/refresh',  refreshRateLimit, asyncHandler(refreshTokens));

// ── Email verification ────────────────────────────────────────────────────────
router.get  ('/verify-email',         emailVerifyRateLimit, asyncHandler(verifyEmail));
router.post ('/resend-verification',  emailVerifyRateLimit, asyncHandler(resendVerification));

// ── Failure fallback ──────────────────────────────────────────────────────────
router.get('/failure', authFailure);

export default router;