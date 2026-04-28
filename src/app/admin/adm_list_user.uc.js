import { lisAllUsers } from '../../infrastructure/repositories/user_repo.js';
import { sanitizeUser} from '../../infrastructure/mapper/user.mapper.js';
import logger from '../../core/logger/logger.js';

export const adminListUsersUC = async () => {
    logger.debug('adminListUsersUC');
    const users = await lisAllUsers();
    return users.map(sanitizeUser);
};