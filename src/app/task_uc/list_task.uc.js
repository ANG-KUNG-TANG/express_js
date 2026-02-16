import * as taskRepo from "../../infrastructure/repositories/task_repo";

export const listTasks = async (filters = {}, options = {}, userId = null) => {
    const finalOptions = { ...options };
    if (userId) {
        finalOptions.userId = userId;
    }
    return await taskRepo.findTasks(filters, finalOptions);
};
