import {
    UserValidationError,
    UserNameTooShortError,
    UserNameTooLongError,
    UserInvalidEmailError,
    UserPasswordTooWeakError,
    UserInvalidRoleError
} from '../../core/errors/user.errors.js';
import { UserRole } from '../../domain/base/user_enums.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A single generic string checker—no hardcoded field names needed!
export const validateStringLength = (value, fieldLabel, min = 3, max = Infinity, errors = {}) => {
    const trimmed = value.trim();
    if (trimmed.length < min) {
        throw errors.tooShort ? new errors.tooShort(min) : new UserValidationError(`${fieldLabel} must be at least ${min} characters`);
    }
    if (trimmed.length > max) {
        throw errors.tooLong ? new errors.tooLong(max) : new UserValidationError(`${fieldLabel} cannot exceed ${max} characters`);
    }
    return trimmed;
};


export const validateEmail = (value) => {
    if (!value || typeof value !== 'string' || !EMAIL_REGEX.test(value)) {
        throw new UserInvalidEmailError(value);
    }
    return value.toLowerCase();
};

export const validatePasswordStrength = (value, min = 8) => {
    if (!value || typeof value !== 'string' || value.length < min) {
        throw new UserPasswordTooWeakError(min);
    }
    return value;
};

export const validateRole = (value) => {
    if (!Object.values(UserRole).includes(value)) {
        throw new UserInvalidRoleError(value);
    }
    return value;
};

export const validateRequired = (value, fieldLabel) => {
    if (value === undefined || value === null || value === '') {
        throw new UserValidationError(`${fieldLabel} is required`);
    }
    return value;
};