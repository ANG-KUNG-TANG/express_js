// src/app/admin/adm_bulk_assign_teacher.uc.js
import { findUserById, bulkAssignTeacher } from '../../infrastructure/repositories/user_repo.js';
import {
    UserNotFoundError,
    UserValidationError,
} from '../../core/errors/user.errors.js';

/**
 * adminBulkAssignTeacherUC(requesterId, { studentIds, teacherId })
 *
 * Reassigns multiple students to a single teacher in one DB call.
 * Returns { assigned: n } — count reflects only student-role users
 * (the repo WHERE clause excludes teacher/admin rows automatically).
 *
 * Guards:
 *  - teacherId must resolve to an existing user with role 'teacher'.
 *  - studentIds must be a non-empty array (max 200 per call).
 *  - Requester's id is stripped from studentIds as a safety measure.
 */
const MAX_BULK = 200;

export const adminBulkAssignTeacherUC = async (requesterId, { studentIds, teacherId } = {}) => {
    if (!teacherId) {
        throw new UserValidationError('teacherId is required');
    }
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new UserValidationError('studentIds must be a non-empty array');
    }
    if (studentIds.length > MAX_BULK) {
        throw new UserValidationError(`cannot reassign more than ${MAX_BULK} students at once`);
    }

    // Verify teacher exists and actually has the teacher role
    const teacher = await findUserById(teacherId);
    if (!teacher) throw new UserNotFoundError(teacherId);
    if (teacher._role !== 'teacher') {
        throw new UserValidationError(`user ${teacherId} is not a teacher`);
    }

    const safeIds = studentIds.filter(id => id !== requesterId);

    if (safeIds.length === 0) {
        throw new UserValidationError('no valid student ids provided');
    }

    return await bulkAssignTeacher(safeIds, teacherId);
};