// app/teacher_uc/teacher_get_student.uc.js

import { findStudentByIdForTeacher } from '../../infra/repositories/user_repo.js';
import { UserValidationError }       from '../../core/errors/user.errors.js';

/**
 * teacherGetStudentUC(teacher, studentId)
 *
 * Returns the full profile of a single student, but only when that student
 * is assigned to the requesting teacher.  The ownership check lives in the
 * repo query — a 404 is returned for both "not found" and "belongs to
 * someone else" so we don't leak existence.
 *
 * @param  {{ id: string }} teacher   - normalised teacher object from asTeacher()
 * @param  {string}         studentId - MongoDB ObjectId string of the student
 * @returns {User}  domain User entity (no password field)
 */
export const teacherGetStudentUC = async (teacher, studentId) => {
    if (!studentId) throw new UserValidationError('studentId is required');

    const teacherId = teacher.id ?? teacher._id;
    if (!teacherId)  throw new UserValidationError('teacher id is missing');

    return await findStudentByIdForTeacher(teacherId, studentId);
};