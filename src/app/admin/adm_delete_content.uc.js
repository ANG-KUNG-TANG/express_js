import * as userService from '../../core/services/user_service.js';
import logger from '../../core/logger/logger.js';

export const admDeleteContentUC = async (taskId, requesterId) => {
    logger.debug('admDeleteContentUC: initiating deletion', { taskId, requesterId });

    const result = await userService.deleteTask(taskId, requesterId);

    logger.debug('admDeleteContentUC: success', { taskId });
    return result;
};