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
    // Role can be 'user' (UserRole.USER default) OR 'student' depending on your UserRole enum.
    // We query by assignedTeacher only and filter out teachers/admins client-side
    // to avoid breaking if the enum value changes.
    const allLinked = await userRepo.findAll({
        assignedTeacher: teacher.id ?? teacher._id,
    });
    // Exclude teachers and admins — keep only regular users / students
    const students = allLinked.filter(s => {
        const role = s._role ?? s.role ?? '';
        return role !== 'teacher' && role !== 'admin';
    });

    if (!includeTaskStats) return students.map(s => userRepo.sanitizeUser(s));

    // Enrich with per-student task counts for the teacher dashboard
    const enriched = await Promise.all(
        students.map(async (student) => {
            const tasks = await findByAssignedBy(teacher.id ?? teacher._id, {
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

            // { ...student } on a class instance only copies own enumerable properties.
            // Class getters (name, email, id, etc.) live on the prototype and are lost.
            // sanitizeUser() explicitly reads each getter into a plain object.
            const plain = userRepo.sanitizeUser(student);
            return { ...plain, taskStats: stats };
        })
    );

    return enriched;
};