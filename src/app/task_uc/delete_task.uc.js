import * as taskRepo from '../../infrastructure/repositories/task_repo';
import { ensureTaskOwnership } from '../../infrastructure/repositories/task_repo';

export const deleteTask = async (taskId, userId) => {
    const task = await taskRepo.findTaskByID(taskId);
    ensureTaskOwnership(task, userId);
    return await taskRepo.deleteTask(taskId);
};