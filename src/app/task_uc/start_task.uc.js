import { TaskNotFoundError } from '../../core/errors/task.errors.js';
import * as taskRepo from '../../infrastructure/repositories/task_repo.js';

export const startTask = async (taskId, userId) => {
    const task = await taskRepo.findTaskByID(taskId);
    if (!task) {
        throw new TaskNotFoundError('Task not found')
    }
    taskRepo.ensureTaskOwnership(task, userId);
    return await taskRepo.startTask(taskId);
};