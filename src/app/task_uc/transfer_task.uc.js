import * as taskRepo from '../../infrastructure/repositories/task_repo';

export const transerTasks = async (fromUserId, toUserId, session =null) => {
return await taskRepo.transferTasks(fromUserId, toUserId, session);
};
