import * as userService from '../../core/services/user_service.js';
import { UserNotFoundError } from '../../core/errors/user.errors.js';
import logger from '../../core/logger/logger.js';

export const adminTransferTasksUC = async ({ fromUserId, toUserId }, requesterId) => {
    logger.debug('adminTransferTasksUC: initiating transfer', { fromUserId, toUserId });

    // 1. Validation: Use Service for existence checks
    const sourceUser = await userService.findUserById(fromUserId);
    const targetUser = await userService.findUserById(toUserId);

    if (!sourceUser || !targetUser) {
        throw new UserNotFoundError('One or both users could not be found');
    }

    // 2. Delegate to Service
    return await userService.transferTasks(fromUserId, toUserId, requesterId);
};