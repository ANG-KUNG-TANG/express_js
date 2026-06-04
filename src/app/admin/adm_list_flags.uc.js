import * as userService from '../../core/services/user_service.js';
import logger from '../../core/logger/logger.js';

export const admListFlagsUC = async (options = {}) => {
    logger.debug('admListFlagsUC: fetching flag records', { options });
    return await userService.listFlags(options);
};