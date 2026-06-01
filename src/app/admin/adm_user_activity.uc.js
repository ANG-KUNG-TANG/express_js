import * as userService from '../../core/services/user_service.js';
import { UserValidationError } from '../../core/errors/user.errors.js';
import logger from '../../core/logger/logger.js';

/**
 * Admin fetches user activity summary for detail panel.
 */
export const adminUserActivityUC = async (targetId) => {
    logger.debug('adminUserActivityUC: fetching activity for', { targetId });
    
    if (!targetId) {
        throw new UserValidationError('targetId is required');
    }
    
    // Delegate to Service: Orchestrates persistence access
    return await userService.getUserActivitySummary(targetId);
};