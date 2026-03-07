// app/password_reset_uc/request_password_reset.uc.js
// Mirrors app/user_uc/create_user.uc.js pattern: import repo + service, export const

import crypto from 'crypto';
import { PasswordResetToken }      from '../../domain/entities/password_reset_token_entity.js';
import { PasswordResetUserNotFoundError } from '../../core/errors/password_reset.errors.js';
import { passwordResetTokenRepo }  from '../../infrastructure/repositories/password_reset_token_repo.js';
import * as userRepo                from '../../infrastructure/repositories/user_repo.js';
import { emailService }            from '../../core/services/email.service.js';

const TOKEN_EXPIRY_MINUTES = 30;

export const requestPasswordResetUseCase = async ({ email }) => {
    const user = await userRepo.findByEmail(email.toLowerCase());

    // Always resolves — prevents email enumeration
    if (!user) throw new PasswordResetUserNotFoundError();

    // Invalidate all previous unused tokens for this user
    await passwordResetTokenRepo.invalidateAllForUser(user.id ?? user._id);

    // Raw token goes in the email link; only its hash is stored
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

    const tokenEntity = new PasswordResetToken({
        userId: user.id ?? user._id,
        tokenHash,
        expiresAt,
    });

    await passwordResetTokenRepo.create(tokenEntity);

    await emailService.sendPasswordResetEmail({
        toEmail:  user.email ?? user._email,
        userName: user.name  ?? user._name,
        rawToken,
    });

    return { message: 'If an account with that email exists, a reset link has been sent.' };
};