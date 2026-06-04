import * as userService from '../../core/services/user_service.js';
import logger from '../../core/logger/logger.js';

export const adminSearchTasksUC = async (options = {}) => {
    logger.debug('adminSearchTasksUC: initiating search', { options });
    return await userService.searchTasksForAdmin(options);
};