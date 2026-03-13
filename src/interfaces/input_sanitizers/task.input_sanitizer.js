/**
 * WritingTask Input Sanitizer
 * Whitelists only writing-task-related fields before they reach the use case layer.
 */

const ALLOWED_FIELDS = {
    create: ['title', 'description', 'taskType', 'examType', 'questionPrompt'],
    update: ['title', 'description', 'questionPrompt', 'taskType', 'examType'],
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