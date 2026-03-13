import { deleteUser } from '../../infrastructure/repositories/user_repo.js';
import logger from '../../core/logger/logger.js';

export const adminDeleteUserUC = async (userId) => {
    logger.debug('adminDeleteUserUC', { userId });
    return await deleteUser(userId);
};