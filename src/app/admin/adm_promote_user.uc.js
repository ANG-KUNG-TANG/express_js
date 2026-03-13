import { promoteToAdmin, sanitizeUser } from '../../infrastructure/repositories/user_repo.js';
import logger from '../../core/logger/logger.js';

export const adminPromoteUserUC = async (userId) => {
    logger.debug('adminPromoteUserUC', { userId });
    const user = await promoteToAdmin(userId);
    return sanitizeUser(user);
};