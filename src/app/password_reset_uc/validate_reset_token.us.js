// app/password_reset_uc/validate_reset_token.uc.js
import crypto from 'crypto';
import { passwordResetTokenRepo } from '../../infrastructure/repositories/password_reset_token_repo.js';
import { PasswordResetTokenNotFoundError } from '../../core/errors/password_reset.errors.js';

/**
 * Called by GET /auth/reset-password/validate?token=...
 * Lets the frontend decide whether to render the reset form or an error page.
 */
export const validateResetTokenUseCase = async ({ rawToken }) => {
    const tokenHash   = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenEntity = await passwordResetTokenRepo.findByHash(tokenHash);

    if (!tokenEntity) throw new PasswordResetTokenNotFoundError();

    // Entity owns the expiry + used logic
    tokenEntity.assertValid();

    return { valid: true, userId: tokenEntity.userId };
};