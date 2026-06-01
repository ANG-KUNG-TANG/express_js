import * as taskService from '../../core/services/task_service.js';
import logger from '../../core/logger/logger.js';

export const adminReviewTaskUC = async (taskId, { feedback }, requesterId) => {
    logger.debug('adminReviewTaskUC: initiating review', { taskId, requesterId });

    // Delegate to Service: Handles repo logic, cache, and audit
    return await taskService.reviewTask(taskId, feedback, requesterId);
};