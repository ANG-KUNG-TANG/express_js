import * as taskService from '../../core/services/task_service.js';
import logger from '../../core/logger/logger.js';

export const admDeleteContentUC = async (taskId, requesterId) => {
    logger.debug('admDeleteContentUC: initiating deletion', { taskId, requesterId });

    // 1. Delegate to Service (Handles validation, repo-deletion, and cache-invalidation)
    const result = await taskService.deleteTask(taskId, requesterId);

    logger.debug('admDeleteContentUC: success', { taskId });
    return result;
};