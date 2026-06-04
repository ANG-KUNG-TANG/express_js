import * as userService from '../../core/services/user_service.js';
import logger from '../../core/logger/logger.js';

export const admResolveFlagUC = async (adminId, flagId) => {
    logger.debug('admResolveFlagUC: resolving flag', { adminId, flagId });
    return await userService.resolveFlag(flagId, adminId);
};