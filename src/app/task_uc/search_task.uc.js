import * as taskRepo from '../../infrastructure/repositories/task_repo.js';
import { TaskValidationError } from '../../core/errors/task.errors.js';

export const searchTasks = async (searchTerms, options = {}, userId = null) => {
    if (!searchTerms || typeof searchTerms !== 'string') {
        throw new TaskValidationError("Search term must be a non-empty string");
    }
    const tasks = await taskRepo.searchTasksByTitle(searchTerms, options);
    if (userId) {
        return tasks.filter(task => task._userId?.toString() === userId.toString());
    }
    return tasks;
};