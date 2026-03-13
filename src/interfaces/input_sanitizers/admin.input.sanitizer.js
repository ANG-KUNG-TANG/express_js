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