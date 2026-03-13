// app/password_reset_uc/reset_password.uc.js

import crypto from 'crypto';
import { hashPassword } from '../validators/password_hash.js';
import { passwordResetTokenRepo }         from '../../infrastructure/repositories/password_reset_token_repo.js';
import * as userRepo                       from '../../infrastructure/repositories/user_repo.js';
import { PasswordResetTokenNotFoundError } from '../../core/errors/password_reset.errors.js';
import { sendNotificationUseCase } from '../notification/send_noti.uc.js';
import { NotificationType }                from '../../domain/entities/notificaiton_entity.js';

export const resetPasswordUseCase = async ({ rawToken, password }) => {
    const tokenHash   = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenEntity = await passwordResetTokenRepo.findByHash(tokenHash);

    if (!tokenEntity) throw new PasswordResetTokenNotFoundError();

    // Throws PasswordResetTokenExpiredError or PasswordResetTokenAlreadyUsedError
    tokenEntity.assertValid();

    const hashedPassword = await hashPassword(password);

    await userRepo.updatePassword(tokenEntity.userId, hashedPassword);

    tokenEntity.markUsed();
    await passwordResetTokenRepo.save(tokenEntity);

    // Fire-and-forget confirmation — doesn't affect the reset result
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