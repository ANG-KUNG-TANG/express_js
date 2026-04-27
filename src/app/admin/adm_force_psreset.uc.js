// src/app/admin/adm_force_password_reset.uc.js
import {
    findUserById,
    setPasswordResetRequired,
} from '../../infrastructure/repositories/user_repo.js';
import {
    UserNotFoundError,
    UserValidationError,
} from '../../core/errors/user.errors.js';

/**
 * adminForcePasswordResetUC(requesterId, targetId)
 *
 * Sets mustResetPassword = true on a user's account.
 * The auth middleware must check this flag on every login and redirect
 * the user to the change-password flow before granting a session.
 *
 * Does NOT change the existing password — it only raises a flag.
 *
 * Guards:
 *  - Requester cannot flag their own account (use profile page for that).
 *  - Flag is idempotent — raising it again on an already-flagged account
 *    is allowed (no error) so admin tooling can safely call it twice.
 */
export const adminForcePasswordResetUC = async (requesterId, targetId) => {
    if (!targetId) {
        throw new UserValidationError('targetId is required');
    }
    if (requesterId === targetId) {
        throw new UserValidationError('use the profile page to reset your own password');
    }

    const target = await findUserById(targetId);
    if (!target) throw new UserNotFoundError(targetId);

    return await setPasswordResetRequired(targetId);
};