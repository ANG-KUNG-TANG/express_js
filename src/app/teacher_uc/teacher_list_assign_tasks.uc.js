/**
 * teacher_list_assigned_tasks.uc.js
 *
 * Returns all tasks a teacher has assigned, with optional filters.
 * Used on the teacher dashboard to see status of all assignments.
 *
 * Depends on:
 *   - findByAssignedBy() — added to task_repo.js in the patched files
 */

import { findByAssignedBy } from '../../infrastructure/repositories/task_repo.js';
import { WritingStatus } from '../../domain/base/task_enums.js';
import { AssignmentStatus } from '../../domain/base/task_enums.js';

export const teacherListAssignedTasksUC = async (teacher, filters = {}) => {
    const {
        studentId,        // filter by specific student
        status,           // WritingStatus value
        assignmentStatus, // AssignmentStatus value
        page  = 1,
        limit = 20,
    } = filters;

    // Validate status values if provided
    if (status && !Object.values(WritingStatus).includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${Object.values(WritingStatus).join(', ')}`);
    }
    if (assignmentStatus && !Object.values(AssignmentStatus).includes(assignmentStatus)) {
        throw new Error(`Invalid assignmentStatus. Must be one of: ${Object.values(AssignmentStatus).join(', ')}`);
    }

    // Build mongo filter — only include defined values
    const mongoFilter = {};
    if (studentId)        mongoFilter.assignedTo        = studentId;
    if (status)           mongoFilter.status            = status;
    if (assignmentStatus) mongoFilter.assignmentStatus  = assignmentStatus;

    const tasks = await findByAssignedBy(teacher.id, mongoFilter, { page, limit });

    return {
        tasks,
        page:  Number(page),
        limit: Number(limit),
        // total not returned here to keep it simple — add a countByAssignedBy()
        // to task_repo.js if you need pagination metadata
    };
};