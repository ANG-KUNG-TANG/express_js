// core/errors/password_reset.errors.js
// Follows the same pattern as user.errors.js & task.errors.js

export class PasswordResetTokenExpiredError extends Error {
    constructor() {
        super('Password reset link has expired. Please request a new one.');
        this.name       = 'PasswordResetTokenExpiredError';
        this.statusCode = 400;
    }
}

export class PasswordResetTokenAlreadyUsedError extends Error {
    constructor() {
        super('This reset link has already been used.');
        this.name       = 'PasswordResetTokenAlreadyUsedError';
        this.statusCode = 400;
    }
}

export class PasswordResetTokenNotFoundError extends Error {
    constructor() {
        super('Invalid or expired password reset link.');
        this.name       = 'PasswordResetTokenNotFoundError';
        this.statusCode = 400;
    }
}

// Intentionally statusCode 200 — prevents email enumeration on the surface
export class PasswordResetUserNotFoundError extends Error {
    constructor() {
        super('If an account with that email exists, a reset link has been sent.');
        this.name       = 'PasswordResetUserNotFoundError';
        this.statusCode = 200;
    }
}