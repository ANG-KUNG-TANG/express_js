// src/app/teacher_uc/teacher_update_profile.uc.js
import * as teacherService from '../../core/services/teacher_service.js';
import { UserValidationError } from '../../core/errors/user.errors.js';

export const teacherUpdateProfileUC = async (teacher, updates = {}) => {
    const teacherId = teacher.id ?? teacher._id;
    if (!teacherId) throw new UserValidationError('teacher id is missing');

    const { name, email, bio, targetBand, examDate } = updates;
    if ([name, email, bio, targetBand, examDate].every((v) => v === undefined)) {
        throw new UserValidationError('no updatable fields provided');
    }

    return await teacherService.updateTeacherProfile(teacherId, { name, email, bio, targetBand, examDate });
};