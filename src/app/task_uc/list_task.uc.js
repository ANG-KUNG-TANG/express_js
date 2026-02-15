import * as taskRepo from "../../infrastructure/repositories/task_repo";

export const listTask = async (filters = {}, options= {}, userId = null) =>{
    const finalOptions = { ...potions};
    if (userId) {
        finalOptions.userId = userId;
    }
    return await taskRepo.findTasks(filters, finalOptions);
};
