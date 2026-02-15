import * as taskRepo from '../../infrastructure/repositories/task_repo';
import { TaskValidationError } from '../../core/errors/task.errors';

export const searchTasks = async (searchTerms, options ={}, userId = null) =>{
    if (!searchTerm || typeof searchTerms !== 'string'){
        throw new TaskValidationError("Search term must be a non-empty string");
    }
    const tasks = await taskRepo.searchTasksByTitle(searchTerms, options);
    if (userId) {
        return tasks.filter(task => task.userId === userId);
    }
    return tasks;
};
