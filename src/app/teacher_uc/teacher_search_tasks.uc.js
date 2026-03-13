import { searchTasksByTitle } from '../../infrastructure/repositories/task_repo.js';
import logger from '../../core/logger/logger.js';

const TEACHER_ALLOWED_STATUSES = ['SUBMITTED', 'REVIEWED'];

/**
 * Search tasks by title, scoped to statuses teachers are allowed to see.
 */
export const teacherSearchTasksUC = async ({ q } = {}) => {
    logger.debug('teacherSearchTasksUC', { q });
    const tasks = await searchTasksByTitle(q ?? '');
    const filtered = tasks.filter(t => TEACHER_ALLOWED_STATUSES.includes(t._status));
    logger.debug('teacherSearchTasksUC: done', { count: filtered.length });
    return filtered;
};