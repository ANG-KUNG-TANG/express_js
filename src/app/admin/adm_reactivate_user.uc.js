import * as userService from '../../core/services/user_service.js';
import { UserNotFoundError, UserValidationError } from '../../core/errors/user.errors.js';

export const adminReactivateUserUC = async (requesterId, targetId) => {
    // 1. Validation
    if (!targetId) throw new UserValidationError('targetId is required');

    // 2. Fetch via Service
    const target = await userService.findUserById(targetId);
    if (!target) throw new UserNotFoundError(targetId);

    // 3. Business Guard
    if (target.isActive) {
        throw new UserValidationError('User is not suspended');
    }

    // 4. Delegate to Service
    return await userService.reactivateUser(targetId, requesterId);
};