// app/password_reset_uc/request_password_reset.uc.js

import crypto                          from 'crypto';
import { PasswordResetToken }          from '../../domain/entities/password_reset_token_entity.js';
import { PasswordResetUserNotFoundError } from '../../core/errors/password_reset.errors.js';
import { passwordResetTokenRepo }      from '../../infrastructure/repositories/password_reset_token_repo.js';
import * as userRepo                   from '../../infrastructure/repositories/user_repo.js';
import { emailService }                from '../../core/services/email.service.js';
import { recordAudit, recordFailure }  from '../../core/services/audit.service.js';
import { AuditAction }                 from '../../domain/base/audit_enums.js';

const TOKEN_EXPIRY_MINUTES = 30;

// req passed from controller so IP is captured in the audit log
export const requestPasswordResetUseCase = async ({ email }, req = null) => {
    // findByEmail throws UserEmailNotFoundError when not found — treat it as "no user"
    // and respond with the same generic message to avoid email enumeration.
    let user = null;
    try {
        user = await userRepo.findByEmail(email.toLowerCase());
    } catch (err) {
        if (err.name === 'UserEmailNotFoundError') {
            recordFailure(AuditAction.AUTH_PASSWORD_RESET_REQUEST, null, {
                email:  email.toLowerCase(),
                reason: 'email not found',
            }, req);
            return { message: 'If an account with that email exists, a reset link has been sent.' };
        }
        throw err;
    }

    const userId = user.id ?? user._id;

    // Invalidate all previous unused tokens for this user
    await passwordResetTokenRepo.invalidateAllForUser(userId);

    // Raw token goes in the email link; only its hash is stored
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

    const tokenEntity = new PasswordResetToken({ userId, tokenHash, expiresAt });
    await passwordResetTokenRepo.create(tokenEntity);

    await emailService.sendPasswordResetEmail({
        toEmail:  user.email ?? user._email,
        userName: user.name  ?? user._name,
        rawToken,
    });

    recordAudit(AuditAction.AUTH_PASSWORD_RESET_REQUEST, userId, {
        email: user.email ?? user._email,
    }, req);

    return { message: 'If an account with that email exists, a reset link has been sent.' };
};