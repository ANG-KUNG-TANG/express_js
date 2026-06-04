import * as userService from '../../core/services/user_service.js';
import logger from '../../core/logger/logger.js';

export const getDashboardStatsUC = async () => {
    logger.debug('getDashboardStatsUC: fetching dashboard data');
    return await userService.getAdminStats();
};