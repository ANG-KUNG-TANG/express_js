import * as contentFlagService from '../../core/services/content_flag_service.js';
import logger from '../../core/logger/logger.js';

export const admListFlagsUC = async (options = {}) => {
    logger.debug('admListFlagsUC: fetching flag records', { options });
    
    // Delegate to Service: Orchestrates persistence access
    return await contentFlagService.listFlags(options);
};