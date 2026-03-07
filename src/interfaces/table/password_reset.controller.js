// interfaces/table/password_reset.controller.js
// Exact same style as user.controller.js:
//   sanitize → UC → auditLogger/logger → sendSuccess

import { requestPasswordResetUseCase } from '../../app/password_reset_uc/request_password_reset.uc.js';
import { validateResetTokenUseCase } from '../../app/password_reset_uc/validate_reset_token.us.js';
import { resetPasswordUseCase } from '../../app/password_reset_uc/reset_password.uc.js';
import {
    sanitizeForgotPasswordInput,
    sanitizeValidateTokenInput,
    sanitizeResetPasswordInput,
} from './password_reset.input_sanitizer.js';
import { sendSuccess }   from '../response_formatter.js';
import { HTTP_STATUS }   from '../http_status.js';
import logger            from '../../core/logger/logger.js';
import auditLogger       from '../../core/logger/audit.logger.js';

// ---------------------------------------------------------------------------
// POST /auth/forgot-password
// ---------------------------------------------------------------------------

export const forgotPassword = async (req, res) => {
    const { email } = sanitizeForgotPasswordInput(req.body);

    logger.debug('passwordReset.forgotPassword called', { requestId: req.id, email });

    const result = await requestPasswordResetUseCase({ email });

    auditLogger.log('auth.password_reset.requested', { email }, req);

    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// GET /auth/reset-password/validate?token=...
// ---------------------------------------------------------------------------

export const validateResetToken = async (req, res) => {
    const { token } = sanitizeValidateTokenInput(req.query);

    logger.debug('passwordReset.validateResetToken called', { requestId: req.id });

    const result = await validateResetTokenUseCase({ rawToken: token });

    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// POST /auth/reset-password
// ---------------------------------------------------------------------------

export const resetPassword = async (req, res) => {
    const { token, password } = sanitizeResetPasswordInput(req.body);

    logger.debug('passwordReset.resetPassword called', { requestId: req.id });

    const result = await resetPasswordUseCase({ rawToken: token, password });

    auditLogger.log('auth.password_reset.completed', {}, req);

    return sendSuccess(res, result, HTTP_STATUS.OK);
};