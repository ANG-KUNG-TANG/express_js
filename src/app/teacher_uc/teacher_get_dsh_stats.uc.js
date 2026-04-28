// app/teacher_uc/teacher_get_dashboard_stats.uc.js

import { getTeacherDashboardStats } from '../../infrastructure/repositories/user_repo.js';
import { UserValidationError }      from '../../core/errors/user.errors.js';

/**
 * teacherGetDashboardStatsUC(teacher)
 *
 * Returns aggregated counts for the teacher dashboard:
 *
 *   studentCount      – how many students are assigned to this teacher
 *   pendingReview     – submitted tasks waiting for feedback
 *   activeAssignments – tasks currently in-flight (assigned/accepted/in_progress)
 *   reviewedThisMonth – tasks this teacher reviewed in the current calendar month
 *
 * @param  {{ id: string }} teacher - normalised teacher object from asTeacher()
 * @returns {{ studentCount, pendingReview, activeAssignments, reviewedThisMonth }}
 */
export const teacherGetDashboardStatsUC = async (teacher) => {
    const teacherId = teacher.id ?? teacher._id;
    if (!teacherId) throw new UserValidationError('teacher id is missing');

    return await getTeacherDashboardStats(teacherId);
};