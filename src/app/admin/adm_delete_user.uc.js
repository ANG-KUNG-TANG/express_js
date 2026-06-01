import * as userService from '../../core/services/user_service.js';
import logger from '../../core/logger/logger.js';

export const adminDeleteUserUC = async (userId, requesterId) => {
    logger.debug('adminDeleteUserUC: initiating', { userId, requesterId });
    
    // Delegate to Service: Handles repo logic + auditing
    return await userService.deleteUser(userId, requesterId);
};