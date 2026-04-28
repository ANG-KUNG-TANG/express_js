import { findUserByEmail } from '../../infrastructure/repositories/user_repo.js';
import { sanitizeUser } from '../../infrastructure/mapper/user.mapper.js';
import logger from '../../core/logger/logger.js';

export const adminGetUserByEmailUC = async (email) => {
    logger.debug('adminGetUserByEmailUC', { email });
    const user = await findUserByEmail(email);
    return sanitizeUser(user);
};