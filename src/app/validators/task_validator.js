import {
    TaskValidationError,
    TaskTitleRequiredError,
    TaskTitleTooShortError,
    TaskTitleTooLongError,
    TaskDueDateInPastError,
    TaskUserIdRequiredError,
    TaskInvalidStatusError,
} from '../../core/errors/task.errors.js';
import { WritingStatus, TaskType, ExamType } from '../../domain/base/task_enums.js';

export const validateRequired = (value, fieldName) => {
    if (value === undefined || value === null || value === '') {
        if (fieldName === 'title')  throw new TaskTitleRequiredError();
        if (fieldName === 'userId') throw new TaskUserIdRequiredError('userId is required');
        throw new TaskValidationError(`${fieldName} is required`);
    }
    return value;
};

export const validateStringLength = (value, fieldName, min = 1, max = Infinity) => {
    if (typeof value !== 'string') {
        throw new TaskValidationError(`${fieldName} must be a string`);
    }
    if (value.trim().length < min) {
        if (fieldName === 'title' && min > 1) throw new TaskTitleTooShortError(`Title must be at least ${min} characters`);
        throw new TaskValidationError(`${fieldName} must be at least ${min} characters`);
    }
    if (value.length > max) {
        if (fieldName === 'title') throw new TaskTitleTooLongError(max);
        throw new TaskValidationError(`${fieldName} cannot exceed ${max} characters`);
    }
    return value;
};

export const validateDate = (value, fieldName, allowNull = true, disallowPast = false) => {
    if (!value && allowNull) return null;
    if (!value) throw new TaskValidationError(`${fieldName} is required`);
    const date = new Date(value);
    if (isNaN(date.getTime())) {
        throw new TaskValidationError(`Invalid due date: ${value}`);
    }
    if (disallowPast && date < new Date()) {
        throw new TaskDueDateInPastError();
    }
    return date;
};

export const validateEnum = (value, enumObject, fieldName) => {
    if (!Object.values(enumObject).includes(value)) {
        if (fieldName === 'status')   throw new TaskInvalidStatusError(`Invalid status: ${value}`);
        if (fieldName === 'taskType') throw new TaskValidationError(`Invalid taskType: ${value}. Must be one of: ${Object.values(TaskType).join(', ')}`);
        if (fieldName === 'examType') throw new TaskValidationError(`Invalid examType: ${value}. Must be one of: ${Object.values(ExamType).join(', ')}`);
        throw new TaskValidationError(`Invalid ${fieldName}: ${value}`);
    }
    return value;
};