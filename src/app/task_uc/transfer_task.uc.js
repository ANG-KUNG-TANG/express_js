import * as taskRepo from '../../infrastructure/repositories/task_repo.js';

export const transferTasks = async (fromUserId, toUserId, session = null) => {
    return await taskRepo.transferTasks(fromUserId, toUserId, session);
};

export const transferSingleTask = async (taskId, fromUserId, toUserId, session = null) =>{
    return await taskRepo.transferSingleTask(taskId, fromUserId, toUserId, session);
};

export const transferAllTasks = async (fromUserId, toUserId, session = null) => {
    return await taskRepo.transferAllTasks(fromUserId, toUserId, session);
};