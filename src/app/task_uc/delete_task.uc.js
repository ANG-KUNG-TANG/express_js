// delete_writing_task_uc.js
import * as taskRepo from '../../infrastructure/repositories/task_repo.js';

export const deleteWritingTask = async (taskId, userId) => {
    const task = await taskRepo.findTaskByID(taskId);
    taskRepo.ensureTaskOwnership(task, userId);
    return await taskRepo.deleteTask(taskId);
};