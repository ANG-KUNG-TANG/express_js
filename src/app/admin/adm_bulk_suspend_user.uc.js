import * as userService from '../../core/services/user_service.js';
import { UserValidationError } from '../../core/errors/user.errors.js';

const MAX_BULK = 100;

export const adminBulkSuspendUsersUC = async (requesterId, ids = []) => {
    // 1. Validation
    if (!Array.isArray(ids) || ids.length === 0) {
        throw new UserValidationError('ids must be a non-empty array');
    }
    if (ids.length > MAX_BULK) {
        throw new UserValidationError(`Cannot suspend more than ${MAX_BULK} users at once`);
    }

    // 2. Safety Rule
    const safeIds = ids.filter(id => id !== requesterId);
    if (safeIds.length === 0) {
        throw new UserValidationError('No valid target IDs provided');
    }

    // 3. Delegate to Service
    return await userService.bulkSuspendUsers(safeIds, requesterId);
};