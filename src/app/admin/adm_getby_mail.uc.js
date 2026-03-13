import { findUserByEmail, sanitizeUser } from '../../infrastructure/repositories/user_repo.js';
import logger from '../../core/logger/logger.js';

export const adminGetUserByEmailUC = async (email) => {
    logger.debug('adminGetUserByEmailUC', { email });
    const user = await findUserByEmail(email);
    return sanitizeUser(user);
};