// src/app/admin/adm_reactivate_user.uc.js
import { findUserById, reactivateUser } from '../../infrastructure/repositories/user_repo.js';
import {
    UserNotFoundError,
    UserValidationError,
} from '../../core/errors/user.errors.js';

/**
 * adminReactivateUserUC(requesterId, targetId)
 *
 * Lifts a suspension — sets status back to 'active'.
 * Only meaningful on a currently suspended account.
 */
export const adminReactivateUserUC = async (requesterId, targetId) => {
    if (!targetId) {
        throw new UserValidationError('targetId is required');
    }

    const target = await findUserById(targetId);
    if (!target) throw new UserNotFoundError(targetId);

    if (target.status !== 'suspended') {
        throw new UserValidationError('user is not suspended');
    }

    return await reactivateUser(targetId);
};