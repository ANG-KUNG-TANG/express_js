// src/app/admin/adm_search_users.uc.js
import { searchUsers }      from '../../infrastructure/repositories/user_repo.js';
import { UserValidationError } from '../../core/errors/user.errors.js';

/**
 * adminSearchUsersUC({ q, role, status, from, to, page, limit })
 *
 * Searches users by name/email text and optional filters.
 * Returns paginated result: { data, total, page, limit, pages }
 *
 * Allowed roles:   'student' | 'teacher' | 'admin'
 * Allowed statuses: 'active' | 'suspended'
 */

const ALLOWED_ROLES   = new Set(['student', 'teacher', 'admin']);
const ALLOWED_STATUSES = new Set(['active', 'suspended']);

export const adminSearchUsersUC = async ({
    q,
    role,
    status,
    from,
    to,
    page  = 1,
    limit = 20,
} = {}) => {
    // ── Validate role filter ──────────────────────────────────────────────
    if (role && !ALLOWED_ROLES.has(role)) {
        throw new UserValidationError(`invalid role filter "${role}"`);
    }

    // ── Validate status filter ────────────────────────────────────────────
    if (status && !ALLOWED_STATUSES.has(status)) {
        throw new UserValidationError(`invalid status filter "${status}"`);
    }

    // ── Validate date range ───────────────────────────────────────────────
    if (from && isNaN(Date.parse(from))) {
        throw new UserValidationError('"from" is not a valid date');
    }
    if (to && isNaN(Date.parse(to))) {
        throw new UserValidationError('"to" is not a valid date');
    }
    if (from && to && new Date(from) > new Date(to)) {
        throw new UserValidationError('"from" must be before "to"');
    }

    // ── Validate pagination ───────────────────────────────────────────────
    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    return await searchUsers({
        q:      q?.trim() || undefined,
        role,
        status,
        from,
        to,
        page:  pageNum,
        limit: limitNum,
    });
};