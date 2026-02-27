// list_writing_task_uc.js
import * as taskRepo from "../../infrastructure/repositories/task_repo.js";

export const listWritingTasks = async (filters = {}, options = {}, userId = null) => {
    const finalOptions = { ...options };
    if (userId) finalOptions.userId = userId;
    return await taskRepo.findTasks(filters, finalOptions);
};