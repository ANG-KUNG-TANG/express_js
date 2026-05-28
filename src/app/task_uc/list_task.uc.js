import * as taskService from '../../core/services/task_service.js';

export const listWritingTasks = async (filters = {}, options = {}, userId = null) => {
    // 1. Prepare options
    const finalOptions = { ...options, ...filters };
    
    // 2. Add security context (userId) if provided
    if (userId) {
        finalOptions.userId = userId;
    }

    // 3. Delegate to Service
    // The service handles calling the Repo to fetch the list.
    // Note: If you want caching for lists, the service should handle that logic.
    return await taskService.findTasks(finalOptions);
};