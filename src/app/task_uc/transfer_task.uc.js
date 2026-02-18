import * as taskRepo from '../../infrastructure/repositories/task_repo.js';

export const transferTasks = async (fromUserId, toUserId, session = null) => {
    return await taskRepo.transferTasks(fromUserId, toUserId, session);
};