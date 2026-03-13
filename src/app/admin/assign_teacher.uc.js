import { findUserById, updateUser, sanitizeUser } from '../../infrastructure/repositories/user_repo.js';
import { UserRole } from '../../domain/base/user_enums.js';
import { UserAlreadyAdminError } from '../../core/errors/user.errors.js';
import logger from '../../core/logger/logger.js';

/**
 * Assign the TEACHER role to a user.
 * Guards: cannot demote an existing ADMIN to teacher.
 */
export const adminAssignTeacherUC = async (userId) => {
    logger.debug('adminAssignTeacherUC', { userId });

    const user = await findUserById(userId);

    if (user._role === UserRole.ADMIN) {
        throw new UserAlreadyAdminError('Cannot change role of an existing admin');
    }

    const updated = await updateUser(userId, { role: UserRole.TEACHER });
    return sanitizeUser(updated);
};