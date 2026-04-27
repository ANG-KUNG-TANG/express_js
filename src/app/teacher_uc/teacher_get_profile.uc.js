// app/teacher_uc/teacher_get_profile.uc.js

import { findUserById }        from '../../infra/repositories/user_repo.js';
import { UserValidationError } from '../../core/errors/user.errors.js';

/**
 * teacherGetProfileUC(teacher)
 *
 * Returns the full profile of the currently authenticated teacher.
 * Wraps findUserById so the controller never imports the repo directly —
 * consistent with the UC → repo → model layering rule.
 *
 * @param  {{ id: string }} teacher - normalised teacher object from asTeacher()
 * @returns {User}  domain User entity (no password field)
 */
export const teacherGetProfileUC = async (teacher) => {
    const teacherId = teacher.id ?? teacher._id;
    if (!teacherId) throw new UserValidationError('teacher id is missing');

    return await findUserById(teacherId);
};