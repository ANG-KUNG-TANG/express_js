// src/app/teacher_uc/teacher_get_student.uc.js
import * as teacherService from '../../core/services/teacher_service.js';
import { UserValidationError } from '../../core/errors/user.errors.js';

export const teacherGetStudentUC = async (teacher, studentId) => {
    if (!studentId) throw new UserValidationError('studentId is required');
    const teacherId = teacher.id ?? teacher._id;
    if (!teacherId) throw new UserValidationError('teacher id is missing');
    return await teacherService.getStudent(teacherId, studentId);
};