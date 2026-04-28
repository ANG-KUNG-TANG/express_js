// src/app/admin/adm_demote_user.uc.js
import {
    findUserById,
    demoteToStudent,
} from '../../infrastructure/repositories/user_repo.js';
import {
    UserNotFoundError,
    UserValidationError,
} from '../../core/errors/user.errors.js';

/**
 * adminDemoteUserUC(requesterId, targetId)
 *
 * Strips a teacher or admin role back to 'student' and clears
 * the assignedTeacher field. Preserves all other account data.
 *
 * Use cases:
 *  - Removing a teacher who is leaving but keeping their account.
 *  - Correcting a mistaken promotion.
 *
 * Guards:
 *  - Cannot demote yourself.
 *  - Target must currently be 'teacher' or 'admin' — demoting an
 *    already-student account is a no-op error to catch caller mistakes.
 */
export const adminDemoteUserUC = async (requesterId, targetId) => {
    if (!targetId) {
        throw new UserValidationError('targetId is required');
    }
    if (requesterId === targetId) {
        throw new UserValidationError('you cannot demote your own account');
    }

    const target = await findUserById(targetId);
    if (!target) throw new UserNotFoundError(targetId);

    if (target._role === 'student') {
        throw new UserValidationError('user is already a student');
    }

    return await demoteToStudent(targetId);
};