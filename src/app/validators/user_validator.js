import {
    UserValidationError,
    UserNameRequiredError,
    UserNameTooShortError,
    UserNameTooLongError,
    UserInvalidEmailError,
    UserPasswordTooWeakError,
    UserInvalidRoleError
} from '../../core/errors/user.errors.js';
import { UserRole } from '../../domain/base/user_enums.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRequired = (value, fieldName) => {
    if (value === undefined || value === null || value === '') {
        if (fieldName == 'name') throw new UserNameRequiredError();
        if (fieldName == 'email') throw new UserInvalidEmailError(value);   // ← add this
        if (fieldName == 'password') throw new UserPasswordTooWeakError();  // ← add this
        throw new UserValidationError(`${fieldName} is required`);          // ← fix typo too
    }
    return value;
};

export const validateStringLength = (value, fieldName,min = 3, max=Infinity) =>{
    if (typeof value !== 'string'){
        throw new UserValidationError(`${fieldName} must be a string`)
    }
    if (value.trim().length < min){
        if (fieldName === 'name') throw new UserNameTooShortError(min);
    }
    if (value.trim().length > max){
        if (fieldName === 'name') throw new UserNameTooLongError(max);
        throw new UserValidationError(`${fieldName} cannot exceed ${max} characters`);
    }
    return value;
};

export const validateEmail =(value) =>{
    if (!value || !EMAIL_REGEX.test(value)) throw new UserInvalidEmailError(value);
    return value.toLowerCase();
};

export const validatePassword = (value, min=8) => {
    if (!value || typeof value !== 'string' || value.length < min){
        throw new UserPasswordTooWeakError(min);
    }
    return value;
}

export const validateRole = (value) =>{
    if (!Object.values(UserRole).includes(value)) throw new UserInvalidRoleError(value);
    return value;
}