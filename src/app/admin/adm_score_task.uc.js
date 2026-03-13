import { scoreTask } from '../../infrastructure/repositories/task_repo.js';
import logger from '../../core/logger/logger.js';

/**
 * Score a REVIEWED task — delegates entirely to the repo.
 * repo.scoreTask() validates status, applies bandScore, transitions to SCORED.
 */
export const adminScoreTaskUC = async (taskId, { bandScore }) => {
    logger.debug('adminScoreTaskUC', { taskId, bandScore });
    const task = await scoreTask(taskId, bandScore);
    logger.debug('adminScoreTaskUC: scored', { taskId, bandScore });
    return task;
};