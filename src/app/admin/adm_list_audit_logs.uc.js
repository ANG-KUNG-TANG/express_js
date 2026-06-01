import * as auditService from '../../core/services/audit.service.js';
import logger from '../../core/logger/logger.js';

export const admListAuditLogsUC = async (options = {}) => {
    logger.debug('admListAuditLogsUC: fetching audit records', { options });
    
    // Delegate to Service: Orchestrates persistence access
    return await auditService.listLogs(options);
};