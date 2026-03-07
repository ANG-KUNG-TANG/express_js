// interfaces/routes/password_reset.router.js
// Mirrors auth.router.js — add these routes to your existing auth router
// or mount separately with:  app.use('/auth', passwordResetRouter)

import { Router }    from 'express';
import rateLimit     from 'express-rate-limit';
import { asyncHandler } from '../async_handler.js';  // reuse your existing wrapper
import {
    forgotPassword,
    validateResetToken,
    resetPassword,
} from '../table/password_reset.controller.js';

// 5 attempts per IP per 15 min — protects against abuse
const resetLimiter = rateLimit({
    windowMs:        15 * 60 * 1000,
    max:             5,
    standardHeaders: true,
    legacyHeaders:   false,
    message:         { success: false, message: 'Too many reset attempts. Try again later.' },
});

export const passwordResetRouter = Router();

passwordResetRouter.post('/forgot-password',         resetLimiter, asyncHandler(forgotPassword));
passwordResetRouter.get ('/reset-password/validate',              asyncHandler(validateResetToken));
passwordResetRouter.post('/reset-password',          resetLimiter, asyncHandler(resetPassword));