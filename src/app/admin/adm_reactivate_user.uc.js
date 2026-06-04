import * as userService from '../../core/services/user_service.js';
import { UserValidationError } from '../../core/errors/user.errors.js';

export const adminReactivateUserUC = async (requesterId, targetId) => {
    if (!targetId) throw new UserValidationError('targetId is required');

    const target = await userService.findUserById(targetId);

    if (target.isActive) {
        throw new UserValidationError('User is not suspended');
    }

    return await userService.reactivateUser(targetId, requesterId);
};