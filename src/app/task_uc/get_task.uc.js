// get_writing_task_uc.js
import * as taskRepo from '../../infrastructure/repositories/task_repo.js';

export const getWritingTaskById = async (taskId, requestingUserId = null) => {
    const task = await taskRepo.findTaskByID(taskId);
    if (requestingUserId) {
        taskRepo.ensureTaskOwnership(task, requestingUserId);
    }
    return task;
};