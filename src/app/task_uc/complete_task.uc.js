import { TaskNotFoundError } from '../../core/errors/task.errors';
import * as taskRepo from '../../infrastructure/repositories/task_repo';

export const completeTask = async (taskId, userId) => {
    const task = await taskRepo.findTaskByID(taskId);
    if (!task){
        throw new TaskNotFoundError("Task not found")
    }
    taskRepo.ensureTaskOwnership(task, userId);
    return await taskRepo.completeTask(taskId);
};