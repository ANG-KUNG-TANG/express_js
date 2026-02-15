import * as taskRepo from '../../infrastructure/repositories/task_repo';
import { ensureTaskOwnership } from '../../infrastructure/repositories/task_repo';

export const completeTask = async (taskId, userId) => {
    const task = await taskRepo.findTaskByID(taskId);
    ensureTaskOwnership(task, userId);
    return await taskRepo.completeTask(taskId);
};