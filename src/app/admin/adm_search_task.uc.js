import * as taskService from '../../core/services/task_service.js';
import logger from '../../core/logger/logger.js';

export const adminSearchTasksUC = async (options = {}) => {
    logger.debug('adminSearchTasksUC: initiating search', { options });
    
    // Delegate to Service: Orchestrates persistence access
    return await taskService.searchTasksForAdmin(options);
};