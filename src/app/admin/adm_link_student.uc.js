import * as userService from '../../core/services/user_service.js';
import * as userRepo from '../../infrastructure/repositories/user_repo.js';
import { ForbiddenError } from '../../core/errors/base.errors.js';
import { UserValidationError } from '../../core/errors/user.errors.js';

export const adminLinkStudentToTeacherUC = async (adminId, studentId, teacherId) => {
    if (!teacherId) throw new UserValidationError('teacherId is required');
    if (!studentId) throw new UserValidationError('studentId is required');

    // 1. Fetch Users — go through repo directly (findUserById is not on userService)
    const student = await userRepo.findUserById(studentId);
    const teacher = await userRepo.findUserById(teacherId);

    // 2. Policy Enforcement
    if (student.role === 'admin' || student.role === 'teacher') {
        throw new ForbiddenError('Cannot link an admin or teacher as a student');
    }
    if (teacher.role !== 'teacher' && teacher.role !== 'admin') {
        throw new ForbiddenError('Target user does not have the teacher role');
    }

    // 3. Delegate to Service
    return await userService.linkStudentToTeacher(adminId, studentId, teacherId);
};

export const adminUnlinkStudentFromTeacherUC = async (adminId, studentId) => {
    if (!studentId) throw new UserValidationError('studentId is required');

    // 1. Fetch student and verify they actually have a teacher assigned
    const student = await userRepo.findUserById(studentId);

    if (student.role === 'admin' || student.role === 'teacher') {
        throw new ForbiddenError('Cannot unlink an admin or teacher');
    }
    if (!student.assignedTeacher) {
        throw new UserValidationError('Student is not linked to any teacher');
    }

    // 2. Unlink by assigning null
    return await userService.linkStudentToTeacher(adminId, studentId, null);
};