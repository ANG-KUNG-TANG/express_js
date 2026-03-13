import { findTaskByID } from '../../infrastructure/repositories/task_repo.js';
import { TaskOwnershipError } from '../../core/errors/task.errors.js';
import logger from '../../core/logger/logger.js';

const TEACHER_ALLOWED_STATUSES = ['SUBMITTED', 'REVIEWED'];

/**
 * Fetch a single task — only if it's in a status teachers are allowed to access.
 */
export const teacherGetTaskUC = async (taskId) => {
    logger.debug('teacherGetTaskUC', { taskId });
    const task = await findTaskByID(taskId); // throws TaskNotFoundError if missing

    if (!TEACHER_ALLOWED_STATUSES.includes(task._status)) {
        throw new TaskOwnershipError(
            taskId,
            `Task status '${task._status}' is not accessible to teachers`
        );
    }

    return task;
};