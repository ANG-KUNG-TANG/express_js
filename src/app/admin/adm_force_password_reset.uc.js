import * as userService from '../../core/services/user_service.js';
import { UserValidationError } from '../../core/errors/user.errors.js';

export const adminForcePasswordResetUC = async (requesterId, targetId) => {
    if (!targetId) throw new UserValidationError('targetId is required');
    if (requesterId === targetId) {
        throw new UserValidationError('Use the profile page to reset your own password');
    }

    // findUserById throws UserNotFoundError if missing — no null check needed
    await userService.findUserById(targetId);

    return await userService.forcePasswordReset(targetId, requesterId);
};