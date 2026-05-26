import { Router }                       from 'express';
import { asyncHandler }                 from '../async_handler.js';
import { passwordResetRateLimit }       from '../../middleware/rate_limit.middleware.js';
import { csrfMiddleware }               from '../../middleware/csrf.middleware.js';
import {
    forgotPassword,
    validateResetToken,
    resetPassword,
} from '../table/password_reset.controller.js';

// Mount under /api/auth:  app.use('/api/auth', passwordResetRouter)

export const passwordResetRouter = Router();

// ── Request reset email — unauthenticated, rate-limited ───────────────────────
passwordResetRouter.post('/forgot-password',
    passwordResetRateLimit,
    asyncHandler(forgotPassword),
);

// ── Validate token — unauthenticated GET, rate-limited ────────────────────────
passwordResetRouter.get('/reset-password/validate',
    passwordResetRateLimit,
    asyncHandler(validateResetToken),
);

// ── Perform reset — unauthenticated POST, rate-limited + CSRF ─────────────────
// CSRF is needed here because this is a state-changing POST triggered from
// a browser form. The frontend should fetch /api/auth/csrf-token first and
// include it as the x-csrf-token header.
passwordResetRouter.post('/reset-password',
    passwordResetRateLimit,
    csrfMiddleware,
    asyncHandler(resetPassword),
);