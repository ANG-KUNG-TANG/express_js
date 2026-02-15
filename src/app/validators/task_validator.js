import {
    TaskValidationError,
    TaskTitleRequiredError,
    TaskTitleTooShorErros,
    TaskTitleTooLongErrors,
    TaskInvalidIdError,
    TaskDueDateInPastError,
    TaskInvalidIdStatusError,
    TaskInvalidPriorityError,
    TaskUserIdRequiredError,
    TaskInvalidStatusError
} from '../../core/errors/task.errors';
import { TaskStatus, TaskPriority } from '../../domain/base/task_enums';

export const validaeRequired = (value, fieldName) =>{
    if (value === undefined || value === null || value ===''){
        if (fieldName === 'userId') throw new TaskUserIdRequiredError();
        throw new TaskValidationError(`${fieldName} is  required`);
    }
    return value;    
}

export const validateStringLength = (value, fieldName, min = 1, max = Infinity) => {
    if (typeof value !== 'string'){
        throw new TaskValidationError(`${fieldName} must bea a string`);
    };
    if (value.length < min) {
        throw new TaskValidationError(`${fieldName} must be at leadt ${min} cahracters`);
    };
    if (value.length > max) {
        if (fieldName === 'title') throw new TaskTitleTooLongErrors(max);
        throw new TaskValidationError(`${fieldName} cannot exceed ${max} character`)
    };
    return value;
}

export const validateDate = (value, fieldName, allowNull = true, disallowPast = false) => {
    if (!value && allowNull) return null;
    if (!value) throw new TaskValidationError(`${fieldName} is required`);

    const date = new Date(value);
    if (isNaN(date.getTime())){
        throw new TaskInvalidIdError(value);
    }
    if (disallowPast && date < new Date()){
        throw new TaskDueDateInPastError();
    }
    return date;
}

export const validateEnum = (value, enumObject, fieldName) =>{
    const enumValues = Object.values(enumObject);
    if (!enumValues.includes(value)){
        if (fieldName === 'status') throw new TaskInvalidStatusError(value);
        if (fieldName === 'priority') throw new TaskInvalidPriorityError(value);
        throw new TaskValidationError(`Invalid ${fieldName} : ${value}`)
    } 
    return value;
}