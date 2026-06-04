import * as userService from '../../core/services/user_service.js';
import { UserValidationError } from '../../core/errors/user.errors.js';
import { UserRole } from '../../domain/base/user_enums.js';

export const adminSuspendUserUC = async (requesterId, targetId) => {
    if (!targetId) throw new UserValidationError('targetId is required');
    if (requesterId === targetId) {
        throw new UserValidationError('You cannot suspend your own account');
    }

    const target = await userService.findUserById(targetId);

    if (target.role === UserRole.ADMIN) {
        throw new UserValidationError('Admin accounts cannot be suspended');
    }
    if (!target.isActive) {
        throw new UserValidationError('User is already suspended');
    }

    return await userService.suspendUser(targetId, requesterId);
};