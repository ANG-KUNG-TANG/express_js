import * as userService from '../../core/services/user_service.js';
import logger from '../../core/logger/logger.js';

/**
 * Admin fetches a user by email.
 */
export const adminGetUserByEmailUC = async (email) => {
    logger.debug('adminGetUserByEmailUC: fetching', { email });
    
    // Delegate to Service
    return await userService.getUserByEmail(email);
};