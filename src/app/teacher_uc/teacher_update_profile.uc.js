// src/app/teacher_uc/teacher_update_profile.uc.js
import * as teacherService from '../../core/services/teacher_service.js';
import * as userRepo from '../../infrastructure/repositories/user_repo.js';
import { UserValidationError } from '../../core/errors/user.errors.js';

export const teacherUpdateProfileUC = async (teacher, updates = {}) => {
    const teacherId = teacher.id ?? teacher._id;
    if (!teacherId) throw new UserValidationError('teacher id is missing');

    const { name, email, bio, targetBand, examDate } = updates;
    if ([name, email, bio, targetBand, examDate].every((v) => v === undefined)) {
        throw new UserValidationError('no updatable fields provided');
    }

    // email goes through its own domain method (validates format, separate concern)
    if (email !== undefined) {
        await userRepo.updateUser(teacherId, (u) => u.updateEmail(email));
    }

    // remaining profile fields
    const profileFields = { name, bio, targetBand, examDate };
    const hasProfileChanges = [name, bio, targetBand, examDate].some((v) => v !== undefined);
    if (hasProfileChanges) {
        return await teacherService.updateTeacherProfile(teacherId, profileFields);
    }

    // email-only update — still return the refreshed profile
    return await teacherService.getTeacherProfile(teacherId);
};