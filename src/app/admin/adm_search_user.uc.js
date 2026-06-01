import * as userService from '../../core/services/user_service.js';
import { UserValidationError } from '../../core/errors/user.errors.js';

const ALLOWED_ROLES   = new Set(['student', 'teacher', 'admin']);
const ALLOWED_STATUSES = new Set(['active', 'suspended']);

export const adminSearchUsersUC = async (params = {}) => {
    const { q, role, status, from, to, page, limit } = params;

    // 1. Validation (The "Guard" responsibility)
    if (role && !ALLOWED_ROLES.has(role)) {
        throw new UserValidationError(`invalid role filter "${role}"`);
    }
    if (status && !ALLOWED_STATUSES.has(status)) {
        throw new UserValidationError(`invalid status filter "${status}"`);
    }
    if (from && isNaN(Date.parse(from))) throw new UserValidationError('"from" is not a valid date');
    if (to && isNaN(Date.parse(to))) throw new UserValidationError('"to" is not a valid date');
    if (from && to && new Date(from) > new Date(to)) throw new UserValidationError('"from" must be before "to"');

    // 2. Delegate to Service
    return await userService.searchUsers({
        q: q?.trim() || undefined,
        role,
        status,
        from,
        to,
        page:  Math.max(1, parseInt(page, 10) || 1),
        limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
    });
};