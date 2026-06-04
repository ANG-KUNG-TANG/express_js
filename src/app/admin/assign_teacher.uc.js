import * as userService from '../../core/services/user_service.js';
import { UserValidationError } from '../../core/errors/user.errors.js';
import { UserRole } from '../../domain/base/user_enums.js';
import logger from '../../core/logger/logger.js';

export const adminAssignTeacherUC = async (userId, requesterId) => {
    logger.debug('adminAssignTeacherUC: initiating role assignment', { userId });

    const user = await userService.findUserById(userId);

    if (user.role === UserRole.ADMIN) {
        throw new UserValidationError('Cannot change role of an existing admin');
    }

    return await userService.assignTeacherRole(userId, requesterId);
};