// app/teacher_uc/teacher_update_profile.uc.js

import { updateProfileInfo }   from '../../infrastructure/repositories/user_repo.js';
import { UserValidationError } from '../../core/errors/user.errors.js';

/**
 * teacherUpdateProfileUC(teacher, updates)
 *
 * Allows a teacher to update the subset of profile fields they own.
 * Role, status, assignedTeacher and password are intentionally excluded —
 * those go through admin flows.
 *
 * Permitted fields:
 *   name, email, bio, targetBand, examDate
 *
 * @param  {{ id: string }} teacher
 * @param  {{ name?, email?, bio?, targetBand?, examDate? }} updates
 * @returns {User}  updated domain User entity
 */
export const teacherUpdateProfileUC = async (teacher, updates = {}) => {
    const teacherId = teacher.id ?? teacher._id;
    if (!teacherId) throw new UserValidationError('teacher id is missing');

    const { name, email, bio, targetBand, examDate } = updates;

    // Guard: at least one field must be present
    if ([name, email, bio, targetBand, examDate].every(v => v === undefined)) {
        throw new UserValidationError('no updatable fields provided');
    }

    // Whitelist only — repo's updateProfileInfo already excludes role/password
    return await updateProfileInfo(teacherId, { name, email, bio, targetBand, examDate });
};