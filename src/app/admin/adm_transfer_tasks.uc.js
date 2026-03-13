import { transferTasks } from '../../infrastructure/repositories/task_repo.js';
import { findUserById }  from '../../infrastructure/repositories/user_repo.js';
import logger from '../../core/logger/logger.js';

/**
 * Bulk-transfer all tasks from one user to another.
 * Validates both users exist first — repo handles the rest.
 */
export const adminTransferTasksUC = async ({ fromUserId, toUserId }) => {
    logger.debug('adminTransferTasksUC', { fromUserId, toUserId });

    // Both throw UserNotFoundError if the user doesn't exist
    await findUserById(fromUserId);
    await findUserById(toUserId);

    const result = await transferTasks(fromUserId, toUserId);
    logger.debug('adminTransferTasksUC: done', result);
    return result;
};