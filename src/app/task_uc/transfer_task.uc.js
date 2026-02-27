// transfer_writing_task_uc.js
import * as taskRepo from '../../infrastructure/repositories/task_repo.js';

export const transferWritingTasks = async (fromUserId, toUserId, session = null) => {
    return await taskRepo.transferTasks(fromUserId, toUserId, session);
};

export const transferSingleWritingTask = async (taskId, fromUserId, toUserId, session = null) => {
    return await taskRepo.transferSingleTask(taskId, fromUserId, toUserId, session);
};