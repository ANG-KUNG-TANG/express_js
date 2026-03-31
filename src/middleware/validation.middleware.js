// src/middleware/validation.middleware.js
import { validationResult } from 'express-validator';

/**
 * Collects express-validator errors and forwards them as a single Error
 * to the global error handler.
 *
 * Place after express-validator chains in a route:
 *   router.post('/route', [...validators], validate, asyncHandler(handler))
 */
export const validate = (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();

    const err     = new Error('Validation failed');
    err.errors    = result.array();   // picked up by error.handler branch 5
    err.statusCode = 400;
    return next(err);
};