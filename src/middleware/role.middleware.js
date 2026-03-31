// src/middleware/role.middleware.js
import { ForbiddenError, UnauthorizedError } from '../core/errors/http.errors.js';

/**
 * requireRole(...roles)
 *
 * Flexible role guard — pass one or more allowed roles.
 * Requires authenticate() to have already run and set req.user.
 *
 * Usage:
 *   router.use(requireRole('admin'))
 *   router.use(requireRole('admin', 'teacher'))
 *   router.get('/route', requireRole('admin'), asyncHandler(handler))
 */
export const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
        return next(new ForbiddenError(
            `Role '${req.user.role}' is not permitted. Required: ${roles.join(' | ')}`
        ));
    }
    next();
};