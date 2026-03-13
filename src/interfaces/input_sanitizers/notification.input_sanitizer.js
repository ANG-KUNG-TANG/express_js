// interfaces/table/notification.input_sanitizer.js

export const sanitizeNotificationQueryInput = ({ page, limit } = {}) => ({
    page:  Math.max(1, parseInt(page  ?? '1',  10) || 1),
    limit: Math.min(50, Math.max(1, parseInt(limit ?? '20', 10) || 20)),
});

export const sanitizeMarkReadInput = ({ ids } = {}) => ({
    ids: ids === 'all'
        ? 'all'
        : Array.isArray(ids) ? ids.map(String) : [],
});