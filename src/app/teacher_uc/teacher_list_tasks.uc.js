import { findTasks } from '../../infrastructure/repositories/task_repo.js';
import logger from '../../core/logger/logger.js';

const TEACHER_ALLOWED_STATUSES = ['SUBMITTED', 'REVIEWED'];

/**
 * Teachers only see SUBMITTED + REVIEWED tasks — never DRAFT or SCORED.
 * Delegates to repo.findTasks() with status scoping enforced here in the UC.
 */
export const teacherListTasksUC = async ({ status, page, limit } = {}) => {
    logger.debug('teacherListTasksUC', { status });

    // If a specific status is requested, only honour it if it's in the allowed set
    const resolvedStatus = status && TEACHER_ALLOWED_STATUSES.includes(status)
        ? status
        : undefined;

    // Query each allowed status and merge if no specific status requested
    if (resolvedStatus) {
        const tasks = await findTasks({}, { status: resolvedStatus, page, limit });
        return tasks;
    }

    // No valid status filter — fetch SUBMITTED and REVIEWED separately and merge
    const [submitted, reviewed] = await Promise.all([
        findTasks({}, { status: 'SUBMITTED', page, limit }),
        findTasks({}, { status: 'REVIEWED',  page, limit }),
    ]);

    const merged = [...submitted, ...reviewed]
        .sort((a, b) => new Date(b._updatedAt) - new Date(a._updatedAt));

    logger.debug('teacherListTasksUC: done', { count: merged.length });
    return merged;
};