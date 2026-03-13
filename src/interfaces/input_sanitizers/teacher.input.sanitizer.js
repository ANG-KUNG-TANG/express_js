// PATCH /api/teacher/writing-tasks/:id/review
export const sanitizeTeacherReview = (req, res, next) => {
    const { feedback } = req.body ?? {};
    if (!feedback || typeof feedback !== 'string' || !feedback.trim()) {
        return next(new Error('feedback is required'));
    }
    req.body = { feedback: feedback.trim() };
    next();
};