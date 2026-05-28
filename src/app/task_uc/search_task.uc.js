import * as taskService from '../../core/services/task_service.js';
import { TaskValidationError } from '../../core/errors/task.errors.js';

export const searchWritingTasks = async (searchTerm, options = {}, userId = null) => {
    // 1. Validation (Business Rule)
    if (!searchTerm || typeof searchTerm !== 'string') {
        throw new TaskValidationError("Search term must be a non-empty string");
    }

    // 2. Delegate to Service
    // The service handles calling the repository
    const tasks = await taskService.searchTasksByTitle(searchTerm, options);

    // 3. Ownership Filtering
    // Note: If you want this to be high-performance, filtering should ideally 
    // happen in the Repository query (using userId in the search), 
    // but filtering here is acceptable for domain-layer logic.
    if (userId) {
        return tasks.filter(task => task.userId === userId.toString());
    }

    return tasks;
};