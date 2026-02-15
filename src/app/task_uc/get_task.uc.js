import { TaskInvalidDueDateError } from '../../core/errors/task.errors';
import * as taskRepo from  '../../infrastructure/repositories/task_repo';
import { ensureTaskOwnership } from '../../infrastructure/repositories/task_repo';

export const getTaskById = async (taskId, requestingUserId = null) => {
    const task = await taskRepo.findTaskByID(taskId);
    if (requestingUserId){
        ensureTaskOwnership(task, requestingUserId);
    }
    return task;
};