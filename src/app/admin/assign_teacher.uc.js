import * as userService from '../../core/services/user_service.js';
import { UserNotFoundError, UserValidationError } from '../../core/errors/user.errors.js';
import logger from '../../core/logger/logger.js';

export const adminAssignTeacherUC = async (userId, requesterId) => {
    logger.debug('adminAssignTeacherUC: initiating role assignment', { userId });

    // 1. Fetch via Service
    const user = await userService.findUserById(userId);
    if (!user) throw new UserNotFoundError(userId);

    // 2. Business Guards
    if (user.role === 'admin') {
        throw new UserValidationError('Cannot change role of an existing admin');
    }

    // 3. Delegate to Service
    return await userService.assignTeacherRole(userId, requesterId);
};