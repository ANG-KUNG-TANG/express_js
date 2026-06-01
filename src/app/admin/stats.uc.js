import * as dashboardService from '../../core/services/dashboard_service.js';
import logger from '../../core/logger/logger.js';

export const getDashboardStatsUC = async () => {
    logger.debug('getDashboardStatsUC: fetching dashboard data');
    return await dashboardService.getAdminStats();
};