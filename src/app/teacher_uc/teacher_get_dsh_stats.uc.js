// src/app/teacher_uc/teacher_get_dsh_stats.uc.js
import * as teacherService from '../../core/services/teacher_service.js';
import { UserValidationError } from '../../core/errors/user.errors.js';

export const teacherGetDashboardStatsUC = async (teacher) => {
    const teacherId = teacher.id ?? teacher._id;
    if (!teacherId) throw new UserValidationError('teacher id is missing');
    return await teacherService.getTeacherDashboardStats(teacherId);
};