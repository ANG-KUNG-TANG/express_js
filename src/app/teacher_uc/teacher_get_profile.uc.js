// src/app/teacher_uc/teacher_get_profile.uc.js
import * as teacherService from '../../core/services/teacher_service.js';
import { UserValidationError } from '../../core/errors/user.errors.js';

export const teacherGetProfileUC = async (teacher) => {
    const teacherId = teacher.id ?? teacher._id;
    if (!teacherId) throw new UserValidationError('teacher id is missing');
    return await teacherService.getTeacherProfile(teacherId);
};