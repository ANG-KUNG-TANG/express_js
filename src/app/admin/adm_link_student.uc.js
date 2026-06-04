import * as userService from '../../core/services/user_service.js';
import { ForbiddenError } from '../../core/errors/base.errors.js';
import { UserValidationError } from '../../core/errors/user.errors.js';
import { UserRole } from '../../domain/base/user_enums.js';

export const adminLinkStudentToTeacherUC = async (adminId, studentId, teacherId) => {
    if (!teacherId) throw new UserValidationError('teacherId is required');
    if (!studentId) throw new UserValidationError('studentId is required');

    // Fetch via service (findUserById now exported)
    const student = await userService.findUserById(studentId);
    const teacher = await userService.findUserById(teacherId);

    if (student.role === UserRole.ADMIN || student.role === UserRole.TEACHER) {
        throw new ForbiddenError('Cannot link an admin or teacher as a student');
    }
    if (teacher.role !== UserRole.TEACHER && teacher.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Target user does not have the teacher role');
    }

    return await userService.linkStudentToTeacher(adminId, studentId, teacherId);
};

export const adminUnlinkStudentFromTeacherUC = async (adminId, studentId) => {
    if (!studentId) throw new UserValidationError('studentId is required');

    const student = await userService.findUserById(studentId);

    if (student.role === UserRole.ADMIN || student.role === UserRole.TEACHER) {
        throw new ForbiddenError('Cannot unlink an admin or teacher');
    }
    if (!student.assignedTeacher) {
        throw new UserValidationError('Student is not linked to any teacher');
    }

    return await userService.linkStudentToTeacher(adminId, studentId, null);
};