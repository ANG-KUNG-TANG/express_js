import * as userService from '../../core/services/user_service.js';
import logger from '../../core/logger/logger.js';

export const admDeleteFlagUC = async (taskId, requesterId) => {
    logger.debug('admDeleteFlagUC: initiating soft-delete', { taskId, requesterId });
    return await userService.softDeleteTask(taskId, requesterId);
};