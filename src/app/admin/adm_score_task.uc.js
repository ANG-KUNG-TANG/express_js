import * as taskService from '../../core/services/task_service.js';
import logger from '../../core/logger/logger.js';

export const adminScoreTaskUC = async (taskId, { bandScore }, requesterId) => {
    logger.debug('adminScoreTaskUC: initiating score', { taskId, bandScore, requesterId });

    // Delegate to Service: Orchestrates persistence, cache, and audit
    return await taskService.scoreTask(taskId, bandScore, requesterId);
};