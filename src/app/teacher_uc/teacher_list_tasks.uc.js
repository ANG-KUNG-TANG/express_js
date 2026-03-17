// src/app/teacher_uc/teacher_list_tasks.uc.js
import { findByAssignedBy } from '../../infrastructure/repositories/task_repo.js';
import { WritingStatus }    from '../../domain/base/task_enums.js';
import logger               from '../../core/logger/logger.js';

// Teacher dashboard default view: all statuses for tasks THEY assigned
// Plus the old admin-pool view (SUBMITTED/REVIEWED) for tasks NOT assigned by them
// The controller passes teacher from req.user, so we receive it here.

export const teacherListTasksUC = async ({ teacherId, status, page, limit } = {}) => {
    logger.debug('teacherListTasksUC', { teacherId, status });

    // Build a mongo filter for optional status
    const filter = {};
    if (status && Object.values(WritingStatus).includes(status)) {
        filter.status = status;
    }

    // Only return tasks this teacher assigned — never other teachers' tasks
    const tasks = await findByAssignedBy(teacherId, filter, { page, limit });

    logger.debug('teacherListTasksUC: done', { count: tasks.length });
    return tasks;
};