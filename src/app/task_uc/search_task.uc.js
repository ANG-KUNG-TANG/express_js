// search_writing_task_uc.js
import * as taskRepo from '../../infrastructure/repositories/task_repo.js';
import { TaskValidationError } from '../../core/errors/task.errors.js';

export const searchWritingTasks = async (searchTerm, options = {}, userId = null) => {
    if (!searchTerm || typeof searchTerm !== 'string') {
        throw new TaskValidationError("Search term must be a non-empty string");
    }
    const tasks = await taskRepo.searchTasksByTitle(searchTerm, options);
    if (userId) {
        return tasks.filter(task => task._userId?.toString() === userId.toString());
    }
    return tasks;
};