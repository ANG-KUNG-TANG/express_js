import * as taskService from '../../core/services/task_service.js';

export const transferWritingTasks = async (fromUserId, toUserId, session = null) => {
    // 1. Delegate to Service (Handles Repo + Cache)
    return await taskService.transferTasks(fromUserId, toUserId, session);
};

export const transferSingleWritingTask = async (taskId, fromUserId, toUserId, session = null) => {
    // 1. Delegate to Service
    return await taskService.transferSingleTask(taskId, fromUserId, toUserId, session);
};