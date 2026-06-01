import * as userService from '../../core/services/user_service.js';
import { UserNotFoundError, UserValidationError } from '../../core/errors/user.errors.js';

export const adminSuspendUserUC = async (requesterId, targetId) => {
    // 1. Validation
    if (!targetId) throw new UserValidationError('targetId is required');
    if (requesterId === targetId) {
        throw new UserValidationError('You cannot suspend your own account');
    }

    // 2. Fetch via Service
    const target = await userService.findUserById(targetId);
    if (!target) throw new UserNotFoundError(targetId);

    // 3. Business Guards
    if (target.role === 'admin') {
        throw new UserValidationError('Admin accounts cannot be suspended');
    }
    if (!target.isActive) {
        throw new UserValidationError('User is already suspended');
    }

    // 4. Delegate to Service
    return await userService.suspendUser(targetId, requesterId);
};