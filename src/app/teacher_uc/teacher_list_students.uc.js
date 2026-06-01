// src/app/teacher_uc/teacher_list_students.uc.js
import * as teacherService from '../../core/services/teacher_service.js';
import { UserValidationError } from '../../core/errors/user.errors.js';

export const teacherListStudentsUC = async (teacher, { includeTaskStats = false } = {}) => {
    const teacherId = String(teacher.id ?? teacher._id);
    if (!teacherId) throw new UserValidationError('teacher id is missing');

    return includeTaskStats
        ? await teacherService.listStudentsWithStats(teacherId)
        : await teacherService.listStudents(teacherId);
};