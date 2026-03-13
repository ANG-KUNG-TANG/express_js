// interfaces/table/password_reset.input_sanitizer.js
// Mirrors user.input_sanitizer.js and task.input_sanitizer.js

export const sanitizeForgotPasswordInput = ({ email } = {}) => ({
    email: (email ?? '').toString().trim().toLowerCase(),
});

export const sanitizeValidateTokenInput = ({ token } = {}) => ({
    token: (token ?? '').toString().trim(),
});

export const sanitizeResetPasswordInput = ({ token, password, confirmPassword } = {}) => ({
    token:           (token           ?? '').toString().trim(),
    password:        (password        ?? '').toString(),
    confirmPassword: (confirmPassword ?? '').toString(),
});