import * as taskService from '../../core/services/task_service.js';
import logger from '../../core/logger/logger.js';

export const adminListTasksUC = async (options = {}) => {
    logger.debug('adminListTasksUC: fetching tasks', { options });
    
    // Delegate to Service: Orchestrates persistence access
    return await taskService.listTasksForAdmin(options);
};