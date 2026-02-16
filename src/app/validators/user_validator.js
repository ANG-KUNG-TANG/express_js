import {
    UserValidationError,
    UserNameRequiredError,
    UserNameTooShortError,
    UserNameTooLongError,
    UserInvalidEmailError,
    UserPasswordTooWEakError,
    UserInvalidRoleError
} from '../../core/errors/user.errors';
import { UserRole } from '../../domain/base/user_enums';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRequired = (value, fileName) => {
    if (value === undefined || value === null || value === ''){
        if (fileName == 'name') throw new UserNameRequiredError();
        throw new UserValidationError(`${fieldName} is rquired`);
    }
    return value;
};

export const validateStringLength = (value, fieldName, max=Infinity) =>{
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
        throw new UserPasswordTooWEakError(min);
    }
    return value;
}

export const validateRole = (value) =>{
    if (!Object.values(UserRole).includes(value)) throw new UserInvalidRoleError(value);
    return value;
}