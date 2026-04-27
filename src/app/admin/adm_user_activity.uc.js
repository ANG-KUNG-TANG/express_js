// src/app/admin/adm_user_activity.uc.js
import { getUserActivitySummary } from '../../infrastructure/repositories/user_repo.js';
import { UserValidationError }    from '../../core/errors/user.errors.js';

/**
 * adminUserActivityUC(targetId)
 *
 * Returns a task/submission breakdown and last-login stamp for one user.
 * Intended for the admin "user detail" panel.
 *
 * Response shape:
 * {
 *   id, name, email, role, status,
 *   lastLoginAt,   // null if never logged in
 *   createdAt,
 *   taskTotal,     // all tasks assigned to this user
 *   taskSubmitted, // tasks in submitted | reviewed | scored state
 *   taskScored,    // tasks with a final band score
 * }
 *
 * The aggregation lives in the repo — this UC only validates input
 * and is the single place to add caching if needed later.
 */
export const adminUserActivityUC = async (targetId) => {
    if (!targetId) {
        throw new UserValidationError('targetId is required');
    }

    return await getUserActivitySummary(targetId);
};