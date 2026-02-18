/**
 * Input Sanitizer
 *
 * Strips unknown/unauthorized fields from request bodies before they
 * reach the use case layer. This prevents prototype pollution and
 * ensures only whitelisted fields are ever processed.
 *
 * The use case layer also validates field values — this layer only
 * controls which keys are allowed through at all.
 */

/**
 * Allowed fields for each operation.
 * Extend this object when new fields are added to the domain.
 */
const ALLOWED_FIELDS = {
    create: ['name', 'email', 'password', 'role'],
    update: ['name', 'email', 'password', 'role'],
    auth:   ['email', 'password'],
};

/**
 * Returns a new object containing only the keys present in the allowlist.
 *
 * @param {Record<string, unknown>} body     - Raw request body
 * @param {string[]} allowedKeys             - Keys to keep
 * @returns {Record<string, unknown>}
 */
const pickAllowed = (body, allowedKeys) => {
    if (!body || typeof body !== 'object') return {};
    return allowedKeys.reduce((acc, key) => {
        if (key in body) acc[key] = body[key];
        return acc;
    }, {});
};

export const sanitizeCreateInput  = (body) => pickAllowed(body, ALLOWED_FIELDS.create);
export const sanitizeUpdateInput  = (body) => pickAllowed(body, ALLOWED_FIELDS.update);
export const sanitizeAuthInput    = (body) => pickAllowed(body, ALLOWED_FIELDS.auth);