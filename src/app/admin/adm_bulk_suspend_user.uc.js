// src/app/admin/adm_bulk_suspend_users.uc.js
import { bulkSuspendUsers } from '../../infrastructure/repositories/user_repo.js';
import { UserValidationError } from '../../core/errors/user.errors.js';

/**
 * adminBulkSuspendUsersUC(requesterId, ids[])
 *
 * Suspends multiple user accounts in a single DB operation.
 * Returns { suspended: n }.
 *
 * Guards:
 *  - ids must be a non-empty array (max 100 per call).
 *  - Requester's own id is stripped — cannot self-suspend in bulk.
 *  - Admin accounts are not filtered here; the repo's updateMany
 *    will update them. If you want to protect admins, add a pre-filter
 *    using findAll({ role: 'admin' }) and subtract from ids.
 */
const MAX_BULK = 100;

export const adminBulkSuspendUsersUC = async (requesterId, ids = []) => {
    if (!Array.isArray(ids) || ids.length === 0) {
        throw new UserValidationError('ids must be a non-empty array');
    }
    if (ids.length > MAX_BULK) {
        throw new UserValidationError(`cannot suspend more than ${MAX_BULK} users at once`);
    }

    const safeIds = ids.filter(id => id !== requesterId);

    if (safeIds.length === 0) {
        throw new UserValidationError('no valid target ids after removing your own account');
    }

    return await bulkSuspendUsers(safeIds);
};