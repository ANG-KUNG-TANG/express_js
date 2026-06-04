import * as userService from '../../core/services/user_service.js';
import logger from '../../core/logger/logger.js';

export const adminListUsersUC = async (params = {}) => {
    logger.debug('adminListUsersUC: fetching users');
    return await userService.searchUsers(params);
};