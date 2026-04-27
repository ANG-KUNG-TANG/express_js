// src/app/admin/adm_suspend_user.uc.js
import { findUserById, suspendUser } from '../../infrastructure/repositories/user_repo.js';
import {
    UserNotFoundError,
    UserValidationError,
} from '../../core/errors/user.errors.js';

/**
 * adminSuspendUserUC(requesterId, targetId)
 *
 * Soft-disables a user account by setting status = 'suspended'.
 * All data is preserved — the user simply cannot log in.
 *
 * Guards:
 *  - Requester cannot suspend themselves.
 *  - Cannot suspend another admin.
 *  - Cannot suspend an already-suspended user.
 */
export const adminSuspendUserUC = async (requesterId, targetId) => {
    if (!targetId) {
        throw new UserValidationError('targetId is required');
    }
    if (requesterId === targetId) {
        throw new UserValidationError('you cannot suspend your own account');
    }

    const target = await findUserById(targetId);
    if (!target) throw new UserNotFoundError(targetId);

    if (target._role === 'admin') {
        throw new UserValidationError('admin accounts cannot be suspended');
    }
    if (target.status === 'suspended') {
        throw new UserValidationError('user is already suspended');
    }

    return await suspendUser(targetId);
};