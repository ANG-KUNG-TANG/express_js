import * as userService from '../../core/services/user_service.js';
import { UserNotFoundError, UserValidationError } from '../../core/errors/user.errors.js';

export const adminDemoteUserUC = async (requesterId, targetId) => {
    // 1. Validation
    if (!targetId) throw new UserValidationError('targetId is required');
    if (requesterId === targetId) {
        throw new UserValidationError('You cannot demote your own account');
    }

    // 2. Fetch via Service
    const target = await userService.findUserById(targetId);
    if (!target) throw new UserNotFoundError(targetId);

    // 3. Business Guard
    if (target.role === 'student') {
        throw new UserValidationError('User is already a student');
    }

    // 4. Delegate to Service (Handles Repo + Audit)
    return await userService.demoteUser(targetId, requesterId);
};