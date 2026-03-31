import { ForbiddenError } from '../../core/errors/http.errors.js';

// PATCH /api/admin/writing-tasks/:id/review
export const sanitizeReviewTask = (req, res, next) => {
    const { feedback } = req.body ?? {};
    if (!feedback || typeof feedback !== 'string' || !feedback.trim()) {
        return next(new Error('feedback is required'));
    }
    req.body = { feedback: feedback.trim() };
    next();
};

// PATCH /api/admin/writing-tasks/:id/score
export const sanitizeScoreTask = (req, res, next) => {
    const bandScore = parseFloat(req.body?.bandScore);
    if (isNaN(bandScore) || bandScore < 0 || bandScore > 9) {
        return next(new Error('bandScore must be a number between 0 and 9'));
    }
    req.body = { bandScore };
    next();
};

// POST /api/admin/writing-tasks/transfer
export const sanitizeTransferTasks = (req, res, next) => {
    const { fromUserId, toUserId } = req.body ?? {};
    if (!fromUserId?.trim() || !toUserId?.trim()) {
        return next(new Error('fromUserId and toUserId are required'));
    }
    if (fromUserId.trim() === toUserId.trim()) {
        return next(new Error('fromUserId and toUserId must be different'));
    }
    req.body = { fromUserId: fromUserId.trim(), toUserId: toUserId.trim() };
    next();
};

// POST /api/admin/flags
export const sanitizeFlagContent = (req, res, next) => {
    const { taskId, reason, severity } = req.body ?? {};

    if (!taskId || typeof taskId !== 'string' || !taskId.trim()) {
        return next(new Error('taskId is required'));
    }
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
        return next(new Error('reason is required'));
    }
    if (reason.trim().length < 5) {
        return next(new Error('reason must be at least 5 characters'));
    }

    const VALID_SEVERITIES = ['low', 'medium', 'high'];
    const resolvedSeverity = severity ?? 'medium';
    if (!VALID_SEVERITIES.includes(resolvedSeverity)) {
        return next(new Error('severity must be low, medium, or high'));
    }

    req.body = { taskId: taskId.trim(), reason: reason.trim(), severity: resolvedSeverity };
    next();
};

// POST /api/admin/flags/:flagId/resolve
export const sanitizeResolveFlag = (req, res, next) => {
    const { flagId } = req.params ?? {};
    if (!flagId || typeof flagId !== 'string' || !flagId.trim()) {
        return next(new Error('flagId param is required'));
    }
    next();
};

// GET /api/admin/audit-logs
export const sanitizeListAuditLogs = (req, res, next) => {
    const { outcome, from, to, page, limit } = req.query;

    if (outcome && !['success', 'failure'].includes(outcome)) {
        return next(new Error('outcome must be success or failure'));
    }
    if (from && isNaN(Date.parse(from))) {
        return next(new Error('from must be a valid ISO date'));
    }
    if (to && isNaN(Date.parse(to))) {
        return next(new Error('to must be a valid ISO date'));
    }
    if (page && (isNaN(Number(page)) || Number(page) < 1)) {
        return next(new Error('page must be a positive number'));
    }
    if (limit && (isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
        return next(new Error('limit must be between 1 and 100'));
    }

    next();
};

// POST /api/admin/notifications
export const sanitizeSendNotification = (req, res, next) => {
    const { audience, targetUserId, type, title, message } = req.body ?? {};

    const VALID_AUDIENCES = ['all', 'teachers', 'students', 'individual'];
    if (!audience || !VALID_AUDIENCES.includes(audience)) {
        return next(new Error(`audience is required and must be one of: ${VALID_AUDIENCES.join(', ')}`));
    }
    if (audience === 'individual' && (!targetUserId || !targetUserId.trim())) {
        return next(new Error('targetUserId is required for individual audience'));
    }

    // Match actual NotificationType enum values from noti_enums.js
    const VALID_TYPES = [
        'test_result', 'exam_reminder', 'score_available', 'practice_ready',
        'password_changed', 'account_alert', 'task_assigned', 'task_accepted',
        'task_declined', 'task_reviewed', 'task_reminder', 'task_unstarted',
        'task_submitted', 'task_scored', 'role_changed', 'teacher_linked',
    ];
    if (!type || !VALID_TYPES.includes(type)) {
        return next(new Error(`type must be one of: ${VALID_TYPES.join(', ')}`));
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
        return next(new Error('title is required'));
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
        return next(new Error('message is required'));
    }

    req.body = {
        ...req.body,
        audience,
        targetUserId: targetUserId?.trim() ?? null,
        type,
        title:   title.trim(),
        message: message.trim(),
        ctaText: req.body.ctaText?.trim() ?? null,
        ctaUrl:  req.body.ctaUrl?.trim()  ?? null,
    };
    next();
};