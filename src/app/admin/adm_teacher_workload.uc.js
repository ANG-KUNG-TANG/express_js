import * as userService from '../../core/services/user_service.js';
import logger from '../../core/logger/logger.js';

/**
 * Admin fetches teacher workloads.
 */
export const adminTeacherWorkloadsUC = async () => {
    logger.debug('adminTeacherWorkloadsUC: fetching teacher workloads');
    
    // Delegate to Service: Orchestrates persistence access
    return await userService.getTeacherWorkloads();
};