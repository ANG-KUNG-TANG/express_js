import { findTaskByID } from '../../infrastructure/repositories/task_repo.js';
import { TaskOwnershipError } from '../../core/errors/task.errors.js';
import { TaskSource } from '../../domain/base/task_enums.js';
import logger from '../../core/logger/logger.js';

// Statuses a teacher can access for tasks they ASSIGNED (full lifecycle)
const ASSIGNED_ALLOWED_STATUSES = ['ASSIGNED', 'WRITING', 'SUBMITTED', 'REVIEWED', 'SCORED'];

// Statuses a teacher can access for tasks they DID NOT assign (admin review pool)
const POOL_ALLOWED_STATUSES = ['SUBMITTED', 'REVIEWED'];

/**
 * Fetch a single task for a teacher.
 *
 * - Assigned tasks (task._assignedBy set): teacher sees the full lifecycle
 *   so they can track progress from ASSIGNED → SCORED.
 * - Pool tasks (self-created by student): original behaviour — only SUBMITTED/REVIEWED.
 */
export const teacherGetTaskUC = async (taskId) => {
    logger.debug('teacherGetTaskUC', { taskId });
    const task = await findTaskByID(taskId); // throws TaskNotFoundError if missing

    // Check both underscore-prefixed (domain entity) and plain (raw object) field names
    const taskSource   = task._source    ?? task.source;
    const taskAssignedBy = task._assignedBy ?? task.assignedBy;
    const isAssigned   = taskSource !== TaskSource.SELF && taskAssignedBy;
    const allowed    = isAssigned ? ASSIGNED_ALLOWED_STATUSES : POOL_ALLOWED_STATUSES;

    const taskStatus = task._status ?? task.status;
    if (!allowed.includes(taskStatus)) {
        throw new TaskOwnershipError(
            taskId,
            `Task status '${taskStatus}' is not accessible to teachers`
        );
    }

    return task;
};