// src/app/teacher_uc/teacher_list_tasks.uc.js
import * as teacherService from '../../core/services/teacher_service.js';
import { WritingStatus } from '../../domain/base/task_enums.js';

export const teacherListTasksUC = async ({ teacherId, status, page = 1, limit = 20 } = {}) => {
    const filter = status && Object.values(WritingStatus).includes(status)
        ? { status }
        : {};
    return await teacherService.listAssignedTasks(teacherId, filter, { page, limit, status });
};