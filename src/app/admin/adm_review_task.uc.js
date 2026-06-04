import * as userService from '../../core/services/user_service.js';
import logger from '../../core/logger/logger.js';

export const adminReviewTaskUC = async (taskId, { feedback }, requesterId) => {
    logger.debug('adminReviewTaskUC: initiating review', { taskId, requesterId });
    return await userService.reviewTask(taskId, feedback, requesterId);
};