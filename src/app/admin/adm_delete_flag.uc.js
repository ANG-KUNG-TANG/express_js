import * as taskService from '../../app/services/task_service.js';
import logger from '../../core/logger/logger.js';

export const admDeleteContentUC = async (taskId, requesterId) => {
    logger.debug('admDeleteContentUC: initiating soft-delete', { taskId, requesterId });

    // Delegate to Service: It handles the status transition, 
    // persistence, cache invalidation, and auditing.
    return await taskService.softDeleteTask(taskId, requesterId);
};