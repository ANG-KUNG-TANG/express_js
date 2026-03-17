// src/app/teacher_uc/teacher_search_tasks.uc.js
import { findByAssignedBy } from '../../infrastructure/repositories/task_repo.js';
import logger                from '../../core/logger/logger.js';

/**
 * Search tasks by title scoped to THIS teacher's assigned tasks only.
 * Uses a case-insensitive regex on the DB side via findByAssignedBy filter.
 */
export const teacherSearchTasksUC = async ({ teacherId, q } = {}) => {
    logger.debug('teacherSearchTasksUC', { teacherId, q });

    const filter = q?.trim()
        ? { title: { $regex: q.trim(), $options: 'i' } }
        : {};

    const tasks = await findByAssignedBy(teacherId, filter);

    logger.debug('teacherSearchTasksUC: done', { count: tasks.length });
    return tasks;
};