import * as userService from '../../core/services/user_service.js';
import logger from '../../core/logger/logger.js';

export const adminPromoteUserUC = async (adminId, userId) => {
    logger.debug('adminPromoteUserUC: initiating promotion', { adminId, userId });

    // Delegate to Service: It handles the promotion logic, auditing, and notifications
    return await userService.promoteUser(adminId, userId);
};