// PATCH /api/teacher/writing-tasks/:id/review
export const sanitizeTeacherReview = (req, res, next) => {
    const { feedback, bandScore } = req.body ?? {};

    if (!feedback || typeof feedback !== 'string' || !feedback.trim()) {
        return next(Object.assign(new Error('feedback is required'), { statusCode: 400 }));
    }

    // Also accept bandScore of 0 (valid IELTS band).
    const score = Number(bandScore);
    if (bandScore === undefined || bandScore === null || bandScore === '' ||
        isNaN(score) || score < 0 || score > 9) {
        return next(Object.assign(
            new Error('bandScore must be a number between 0 and 9'),
            { statusCode: 400 }
        ));
    }

    // FIX: was only passing { feedback } — bandScore was silently dropped,
    // causing every review attempt to fail with a validation error downstream.
    req.body = { feedback: feedback.trim(), bandScore: score };
    next();
};