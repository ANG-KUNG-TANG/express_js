import * as userService from '../../core/services/user_service.js';
import logger from '../../core/logger/logger.js';

export const admListAuditLogsUC = async (options = {}) => {
    logger.debug('admListAuditLogsUC: fetching audit records', { options });
    return await userService.listLogs(options);
};