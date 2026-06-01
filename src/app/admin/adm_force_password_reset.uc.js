import * as userService from '../../core/services/user_service.js';
import { UserNotFoundError, UserValidationError } from '../../core/errors/user.errors.js';

export const adminForcePasswordResetUC = async (requesterId, targetId) => {
    // 1. Validation
    if (!targetId) throw new UserValidationError('targetId is required');
    if (requesterId === targetId) {
        throw new UserValidationError('Use the profile page to reset your own password');
    }

    // 2. Fetch via Service
    const target = await userService.findUserById(targetId);
    if (!target) throw new UserNotFoundError(targetId);

    // 3. Delegate to Service
    return await userService.forcePasswordReset(targetId, requesterId);
};