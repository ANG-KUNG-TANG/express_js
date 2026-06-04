import * as userService from '../../core/services/user_service.js';
import { UserNotFoundError, UserValidationError } from '../../core/errors/user.errors.js';
import { UserRole } from '../../domain/base/user_enums.js';

export const adminDemoteUserUC = async (requesterId, targetId) => {
    if (!targetId) throw new UserValidationError('targetId is required');
    if (requesterId === targetId) {
        throw new UserValidationError('You cannot demote your own account');
    }

    const target = await userService.findUserById(targetId);
    if (!target) throw new UserNotFoundError(targetId);

    if (target.role === UserRole.USER) {
        throw new UserValidationError('User is already a student');
    }

    return await userService.demoteUser(targetId, requesterId);
};