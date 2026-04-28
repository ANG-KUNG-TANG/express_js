// interfaces/input_sanitizers/teacher.input.sanitizer.js

// ── PATCH /api/teacher/writing-tasks/:id/review ───────────────────────────────
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

// ── PATCH /api/teacher/profile ────────────────────────────────────────────────
// Teachers may only update: name, email, bio.
// targetBand and examDate are student-only fields — excluded here.
export const sanitizeUpdateProfile = (req, res, next) => {
    const { name, email, bio } = req.body ?? {};

    // At least one field must be present
    if (name === undefined && email === undefined && bio === undefined) {
        return next(Object.assign(
            new Error('provide at least one field to update: name, email, or bio'),
            { statusCode: 400 }
        ));
    }

    const cleaned = {};

    if (name !== undefined) {
        if (typeof name !== 'string' || !name.trim()) {
            return next(Object.assign(new Error('name must be a non-empty string'), { statusCode: 400 }));
        }
        cleaned.name = name.trim();
    }

    if (email !== undefined) {
        if (typeof email !== 'string' || !email.trim()) {
            return next(Object.assign(new Error('email must be a non-empty string'), { statusCode: 400 }));
        }
        // Basic format check — full validation happens in the UC / model layer
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return next(Object.assign(new Error('email format is invalid'), { statusCode: 400 }));
        }
        cleaned.email = email.trim().toLowerCase();
    }

    if (bio !== undefined) {
        if (typeof bio !== 'string') {
            return next(Object.assign(new Error('bio must be a string'), { statusCode: 400 }));
        }
        cleaned.bio = bio.trim();
    }

    req.body = cleaned;
    next();
};