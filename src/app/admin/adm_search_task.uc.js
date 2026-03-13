import { searchTasksByTitle, findTasks } from '../../infrastructure/repositories/task_repo.js';
import logger from '../../core/logger/logger.js';

/**
 * Search tasks by title across all users.
 * If a status filter is also provided, post-filters the results.
 */
export const adminSearchTasksUC = async ({ q, status } = {}) => {
    logger.debug('adminSearchTasksUC', { q, status });

    if (q) {
        // searchTasksByTitle returns all-user results (no userId scoping in repo)
        let tasks = await searchTasksByTitle(q);
        if (status) tasks = tasks.filter(t => t._status === status);
        logger.debug('adminSearchTasksUC: done (by title)', { count: tasks.length });
        return tasks;
    }

    // No query — fall back to filtered list
    const tasks = await findTasks({}, { status });
    logger.debug('adminSearchTasksUC: done (filtered list)', { count: tasks.length });
    return tasks;
};