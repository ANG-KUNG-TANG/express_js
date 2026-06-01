import * as contentFlagService from '../../core/services/content_flag_service.js';
import logger from '../../core/logger/logger.js';

export const admResolveFlagUC = async (adminId, flagId) => {
    logger.debug('admResolveFlagUC: resolving flag', { adminId, flagId });
    
    // Delegate to Service: Orchestrates persistence access and auditing
    return await contentFlagService.resolveFlag(flagId, adminId);
};