import * as userService from '../../core/services/user_service.js';
import logger from '../../core/logger/logger.js';

export const adminListTasksUC = async (options = {}) => {
    logger.debug('adminListTasksUC: fetching tasks', { options });
    return await userService.listTasksForAdmin(options);
};