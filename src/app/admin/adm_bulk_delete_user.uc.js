// src/app/admin/adm_bulk_delete_users.uc.js
import { bulkDeleteUsers } from '../../infrastructure/repositories/user_repo.js';
import { UserValidationError } from '../../core/errors/user.errors.js';

/**
 * adminBulkDeleteUsersUC(requesterId, ids[])
 *
 * Hard-deletes multiple users in a single DB operation.
 * Returns { deleted: n }.
 *
 * Guards:
 *  - ids must be a non-empty array (max 100 per call to prevent abuse).
 *  - Requester's own id is automatically removed from the list —
 *    an admin cannot accidentally delete themselves in a bulk action.
 *  - Validated id format is enforced inside the repo; this UC adds
 *    the array-level guards.
 */
const MAX_BULK = 100;

export const adminBulkDeleteUsersUC = async (requesterId, ids = []) => {
    if (!Array.isArray(ids) || ids.length === 0) {
        throw new UserValidationError('ids must be a non-empty array');
    }
    if (ids.length > MAX_BULK) {
        throw new UserValidationError(`cannot delete more than ${MAX_BULK} users at once`);
    }

    // Silently strip the requester so they can't self-delete by accident
    const safeIds = ids.filter(id => id !== requesterId);

    if (safeIds.length === 0) {
        throw new UserValidationError('no valid target ids after removing your own account');
    }

    return await bulkDeleteUsers(safeIds);
};