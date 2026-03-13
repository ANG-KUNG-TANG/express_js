import { reviewTask } from '../../infrastructure/repositories/task_repo.js';
import logger from '../../core/logger/logger.js';

/**
 * Review a SUBMITTED task — delegates entirely to the repo.
 * repo.reviewTask() validates status, applies feedback, transitions to REVIEWED.
 */
export const adminReviewTaskUC = async (taskId, { feedback }) => {
    logger.debug('adminReviewTaskUC', { taskId });
    const task = await reviewTask(taskId, feedback);
    logger.debug('adminReviewTaskUC: reviewed', { taskId });
    return task;
};