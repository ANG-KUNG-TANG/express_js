import { reviewTask } from '../../infrastructure/repositories/task_repo.js';
import logger from '../../core/logger/logger.js';

/**
 * Teacher reviews a SUBMITTED task.
 * repo.reviewTask() handles the status guard + transition to REVIEWED.
 * teacherId is stored via the controller — the repo doesn't need it,
 * but the audit log in the controller captures it.
 */
export const teacherReviewTaskUC = async (taskId, { feedback }) => {
    logger.debug('teacherReviewTaskUC', { taskId });
    const task = await reviewTask(taskId, feedback);
    logger.debug('teacherReviewTaskUC: reviewed', { taskId });
    return task;
};