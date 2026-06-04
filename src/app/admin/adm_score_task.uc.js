import * as userService from '../../core/services/user_service.js';
import logger from '../../core/logger/logger.js';

export const adminScoreTaskUC = async (taskId, { bandScore }, requesterId) => {
    logger.debug('adminScoreTaskUC: initiating score', { taskId, bandScore, requesterId });
    return await userService.scoreTask(taskId, bandScore, requesterId);
};