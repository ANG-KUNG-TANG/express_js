// app/password_reset_uc/reset_password.uc.js

import crypto                          from 'crypto';
import { hashPassword }                from '../validators/password_hash.js';
import { passwordResetTokenRepo }      from '../../infrastructure/repositories/password_reset_token_repo.js';
import * as userRepo                   from '../../infrastructure/repositories/user_repo.js';
import { PasswordResetTokenNotFoundError } from '../../core/errors/password_reset.errors.js';
import { sendNotificationUseCase }     from '../notification/send_noti.uc.js';
import { NotificationType }            from '../../domain/entities/notificaiton_entity.js';
import { recordAudit, recordFailure }  from '../../core/services/audit.service.js';
import { AuditAction }                 from '../../domain/base/audit_enums.js';

// req passed from controller so IP is captured — critical for security events
export const resetPasswordUseCase = async ({ rawToken, password }, req = null) => {
    const tokenHash   = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenEntity = await passwordResetTokenRepo.findByHash(tokenHash);

    if (!tokenEntity) {
        recordFailure(AuditAction.AUTH_PASSWORD_RESET_DONE, null, {
            reason: 'token not found',
        }, req);
        throw new PasswordResetTokenNotFoundError();
    }

    try {
        // Throws PasswordResetTokenExpiredError or PasswordResetTokenAlreadyUsedError
        tokenEntity.assertValid();
    } catch (err) {
        recordFailure(AuditAction.AUTH_PASSWORD_RESET_DONE, tokenEntity.userId, {
            reason: err.message,
        }, req);
        throw err;
    }

    const hashedPassword = await hashPassword(password);
    await userRepo.updateUser(tokenEntity.userId, { password: hashedPassword });

    tokenEntity.markUsed();
    await passwordResetTokenRepo.save(tokenEntity);

    // Successful reset — log it with userId so it's traceable
    recordAudit(AuditAction.AUTH_PASSWORD_RESET_DONE, tokenEntity.userId, {}, req);

    // Fire-and-forget confirmation notification
    sendNotificationUseCase({
        userId:  tokenEntity.userId,
        type:    NotificationType.PASSWORD_CHANGED,
        title:   'Your password was changed',
        message: "Your IELTS Platform password was successfully reset. If this wasn't you, contact support immediately.",
    }).catch((err) =>
        console.error('[resetPasswordUseCase] confirmation notification failed:', err.message)
    );

    return { message: 'Password has been reset successfully.' };
};