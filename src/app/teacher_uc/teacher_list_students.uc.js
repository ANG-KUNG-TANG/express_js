/**
 * teacher_list_students.uc.js
 *
 * Returns all students assigned to the requesting teacher.
 * Optionally enriches each student with live task stats.
 *
 * Depends on:
 *   - userRepo.findAll({ assignedTeacher, role }) — your existing user repo
 *   - findByAssignedBy() — added to task_repo.js in the patched files
 */

import * as userRepo  from '../../infrastructure/repositories/user_repo.js';
import { findByAssignedBy } from '../../infrastructure/repositories/task_repo.js';
import { WritingStatus, AssignmentStatus } from '../../domain/base/task_enums.js';

export const teacherListStudentsUC = async (teacher, { includeTaskStats = false } = {}) => {
    // All users where assignedTeacher === this teacher's id
    const students = await userRepo.findAll({
        assignedTeacher: teacher.id,
        role: 'student',
    });

    if (!includeTaskStats) return students;

    // Enrich with per-student task counts for the teacher dashboard
    const enriched = await Promise.all(
        students.map(async (student) => {
            const tasks = await findByAssignedBy(teacher.id, {
                assignedTo: student._id ?? student.id,
            });

            const stats = {
                total:      tasks.length,
                assigned:   tasks.filter((t) => t._status === WritingStatus.ASSIGNED).length,
                writing:    tasks.filter((t) => t._status === WritingStatus.WRITING).length,
                submitted:  tasks.filter((t) => t._status === WritingStatus.SUBMITTED).length,
                reviewed:   tasks.filter((t) => t._status === WritingStatus.REVIEWED).length,
                scored:     tasks.filter((t) => t._status === WritingStatus.SCORED).length,
                declined:   tasks.filter((t) => t._assignmentStatus === AssignmentStatus.DECLINED).length,
                pending:    tasks.filter((t) => t._assignmentStatus === AssignmentStatus.PENDING_ACCEPTANCE).length,
            };

            return { ...student, taskStats: stats };
        })
    );

    return enriched;
};