// list_writing_task_uc.js
import * as taskRepo from "../../infrastructure/repositories/task_repo.js";

export const listWritingTasks = async (filters = {}, options = {}, userId = null) => {
    // findTasks reads status/taskType/examType from options, not the filter object
    const finalOptions = { ...options, ...filters };
    if (userId) finalOptions.userId = userId;
    return await taskRepo.findTasks({}, finalOptions);
};