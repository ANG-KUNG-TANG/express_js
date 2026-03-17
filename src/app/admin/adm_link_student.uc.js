/**
 * adm_link_student.uc.js
 *
 * Admin links a student to a specific teacher.
 * Sets student.assignedTeacher = teacherId.
 *
 * Route: PATCH /api/admin/users/:studentId/link-teacher  body: { teacherId }
 * Route: PATCH /api/admin/users/:studentId/unlink-teacher
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

    // 1. Verify student exists and is a regular user (not admin / teacher)
    const student = await findUserById(studentId);
    if (!student) throw new NotFoundError('Student not found');

    const studentRole = student._role ?? student.role;
    if (studentRole === UserRole.ADMIN || studentRole === 'admin') {
        throw new ForbiddenError('Cannot link an admin to a teacher');
    }
    if (studentRole === UserRole.TEACHER || studentRole === 'teacher') {
        throw new ForbiddenError('Target user is already a teacher — cannot be linked as a student');
    }

    // 2. Verify teacher exists and actually has the teacher (or admin) role
    const teacher = await findUserById(teacherId);
    if (!teacher) throw new NotFoundError('Teacher not found');

    const teacherRole = teacher._role ?? teacher.role;
    if (teacherRole !== UserRole.TEACHER && teacherRole !== 'teacher' &&
        teacherRole !== UserRole.ADMIN   && teacherRole !== 'admin') {
        throw new ForbiddenError('Target teacher does not have the teacher role');
    }

    // 3. Set assignedTeacher on the student
    const updated = await updateUser(studentId, { assignedTeacher: teacherId });
    logger.info('adminLinkStudentToTeacherUC: linked', { studentId, teacherId });
    return sanitizeUser(updated);
};

/**
 * Remove the link between a student and their teacher.
 */
export const adminUnlinkStudentFromTeacherUC = async (studentId) => {
    logger.debug('adminUnlinkStudentFromTeacherUC', { studentId });

    const student = await findUserById(studentId);
    if (!student) throw new NotFoundError('Student not found');

    const updated = await updateUser(studentId, { assignedTeacher: null });
    logger.info('adminUnlinkStudentFromTeacherUC: unlinked', { studentId });
    return sanitizeUser(updated);
};