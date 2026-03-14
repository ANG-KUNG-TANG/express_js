/**
 * adm_link_student.uc.js
 *
 * Admin links a student to a specific teacher.
 * Sets student.assignedTeacher = teacherId.
 *
 * This is the prerequisite for teacher_assign_task.uc.js —
 * a teacher can only assign tasks to students linked to them.
 *
 * Route: PATCH /api/admin/users/:studentId/link-teacher
 * Body:  { teacherId }
 */

import { findUserById, updateUser, sanitizeUser } from '../../infrastructure/repositories/user_repo.js';
import { UserRole } from '../../domain/base/user_enums.js';
import {
    NotFoundError,
    ValidationError,
    ForbiddenError,
} from '../../core/errors/base.errors.js';
import logger from '../../core/logger/logger.js';

export const adminLinkStudentToTeacherUC = async (studentId, teacherId) => {
    logger.debug('adminLinkStudentToTeacherUC', { studentId, teacherId });

    if (!teacherId) throw new ValidationError('teacherId is required in request body');

    // 1. Verify student exists and is a student
    const student = await findUserById(studentId);
    if (!student) throw new NotFoundError('Student not found');
    if (student._role !== UserRole.USER && student._role !== 'student') {
        throw new ForbiddenError('Target user is not a student');
    }

    // 2. Verify teacher exists and is a teacher
    const teacher = await findUserById(teacherId);
    if (!teacher) throw new NotFoundError('Teacher not found');
    if (student._role === UserRole.ADMIN) {
        throw new ForbiddenError('Cannot reassign an admin');
    }

    // 3. Set assignedTeacher on the student
    const updated = await updateUser(studentId, { assignedTeacher: teacherId });

    logger.info('adminLinkStudentToTeacherUC: linked', { studentId, teacherId });
    return sanitizeUser(updated);
};

/**
 * Remove the link between a student and their teacher.
 * Route: PATCH /api/admin/users/:studentId/unlink-teacher
 */
export const adminUnlinkStudentFromTeacherUC = async (studentId) => {
    logger.debug('adminUnlinkStudentFromTeacherUC', { studentId });

    const student = await findUserById(studentId);
    if (!student) throw new NotFoundError('Student not found');

    const updated = await updateUser(studentId, { assignedTeacher: null });

    logger.info('adminUnlinkStudentFromTeacherUC: unlinked', { studentId });
    return sanitizeUser(updated);
};