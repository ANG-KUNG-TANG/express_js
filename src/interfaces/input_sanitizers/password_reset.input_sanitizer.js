// interfaces/input_sanitizers/password_reset.input_sanitizer.js

import { UserValidationError } from '../../core/errors/user.errors.js';

export const sanitizeForgotPasswordInput = ({ email } = {}) => {
    if (!email || typeof email !== 'string') {
        throw new UserValidationError('email is required');
    }
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        throw new UserValidationError('invalid email format');
    }
    return { email: trimmed };
};

export const sanitizeValidateTokenInput = ({ token } = {}) => {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
        throw new UserValidationError('token is required');
    }
    return { token: token.trim() };
};

export const sanitizeResetPasswordInput = ({ token, password } = {}) => {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
        throw new UserValidationError('token is required');
    }
    if (!password || typeof password !== 'string') {
        throw new UserValidationError('password is required');
    }
    if (password.length < 8) {
        throw new UserValidationError('password must be at least 8 characters');
    }
    return { token: token.trim(), password };
};