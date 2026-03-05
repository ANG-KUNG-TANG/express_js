import * as taskRepo from '../../infrastructure/repositories/task_repo.js';

export const startWritingTask = async (taskId, userId) => {
    const task = await taskRepo.findTaskByID(taskId);

    taskRepo.ensureTaskOwnership(task, userId);

    return await taskRepo.startWritingTask(task);
};