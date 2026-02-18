/**
 * Task Input Sanitizer
 * Whitelists only task-related fields before they reach the use case layer.
 */

const ALLOWED_FIELDS = {
    create: ['title', 'description', 'status', 'priority', 'dueDate'],
    update: ['title', 'description', 'status', 'priority', 'dueDate'],
};

const pickAllowed = (body, allowedKeys) => {
    if (!body || typeof body !== 'object') return {};
    return allowedKeys.reduce((acc, key) => {
        if (key in body) acc[key] = body[key];
        return acc;
    }, {});
};

export const sanitizeCreateInput = (body) => pickAllowed(body, ALLOWED_FIELDS.create);
export const sanitizeUpdateInput = (body) => pickAllowed(body, ALLOWED_FIELDS.update);