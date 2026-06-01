import * as userService from '../../core/services/user_service.js';
import logger from '../../core/logger/logger.js';

export const adminListUsersUC = async () => {
    logger.debug('adminListUsersUC: fetching all users');
    
    // Delegate to Service: Orchestrates persistence access
    return await userService.listAllUsers();
};