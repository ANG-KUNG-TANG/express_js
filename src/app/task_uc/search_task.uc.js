import * as taskService from '../../core/services/task_service.js';
import { TaskValidationError } from '../../core/errors/task.errors.js';

export const searchWritingTasks = async (searchTerm, options = {}, userId = null) => {
    // 1. Validation (Business Rule)
    if (!searchTerm || typeof searchTerm !== 'string') {
        throw new TaskValidationError("Search term must be a non-empty string");
    }

    // 2. Delegate to Service — pass userId so the repo filters at the DB level
    return await taskService.searchTasksByTitle(searchTerm, { ...options, userId });
};