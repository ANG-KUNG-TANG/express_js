// src/app/teacher_uc/teacher_list_assign_tasks.uc.js
import * as teacherService from '../../core/services/teacher_service.js';
import { WritingStatus, AssignmentStatus } from '../../domain/base/task_enums.js';

export const teacherListAssignedTasksUC = async (teacher, filters = {}) => {
    const { studentId, status, assignmentStatus, page = 1, limit = 20 } = filters;

    if (status && !Object.values(WritingStatus).includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${Object.values(WritingStatus).join(', ')}`);
    }
    if (assignmentStatus && !Object.values(AssignmentStatus).includes(assignmentStatus)) {
        throw new Error(`Invalid assignmentStatus. Must be one of: ${Object.values(AssignmentStatus).join(', ')}`);
    }

    const filter = {};
    if (studentId)        filter.assignedTo       = studentId;
    if (status)           filter.status           = status;
    if (assignmentStatus) filter.assignmentStatus = assignmentStatus;

    const tasks = await teacherService.listAssignedTasks(teacher.id, filter, { page, limit });
    return { tasks, page: Number(page), limit: Number(limit) };
};