import { AppError } from '../../core/errors/base.errors.js';
import {
    ValidationError,
    ConflictError,
    ForbiddenError,
    BusinessRuleError,
    InfrastructureError,
    InternaslServerErrror,
    NotFoundError,
    UnauthorizedError,
} from '../../core/errors/http.errors.js';
import {
    TaskNotFoundError,
    TaskValidationError,
    TaskTitleRequiredError,
    TaskTitleTooShortError,
    TaskTitleTooLongError,
    TaskInvalidStatusError,
    TaskInvalidPriorityError,
    TaskInvalidDueDateError,
    TaskDueDateInPastError,
    TaskUserIdRequiredError,
    TaskInvalidUserIdError,
    TaskExtraFieldsError,
    TaskBusinessRuleError,
    TaskAlreadyCompletedError,
    TaskNotInProgressError,
    TaskNotPendingError,
    TaskCannotEditDeletedError,
    TaskDueDateChangeAfterCompletionError,
    TaskOwnershipError,
    TaskDuplicateTitleError,
    TaskInvalidIdError,
} from '../../core/errors/task.errors.js';
import {
    UserNotFoundError,
    UserEmailNotFoundError,
    UserValidationError,
    UserNameRequiredError,
    UserNameTooShortError,
    UserNameTooLongError,
    UserInvalidEmailError,
    UserPasswordTooWeakError,
    UserInvalidRoleError,
    UserBusinessRuleError,
    UserAlreadyAdminError,
    UserEmailAlreadyExistsError,
    InvalidCredentialsError,
    UserNotAuthenticatedError,
    UserInsufficientPermissionError,
} from '../../core/errors/user.errors.js';

// ---------------------------------------------------------------------------
// base.errors.js
// ---------------------------------------------------------------------------

describe('AppError (base)', () => {
    it('sets message, statusCode, code and details', () => {
        const err = new AppError('boom', 503, 'SERVICE_DOWN', { info: 'db' });
        expect(err.message).toBe('boom');
        expect(err.statusCode).toBe(503);
        expect(err.code).toBe('SERVICE_DOWN');
        expect(err.details).toEqual({ info: 'db' });
    });

    it('uses sensible defaults', () => {
        const err = new AppError('oops');
        expect(err.statusCode).toBe(500);
        expect(err.code).toBe('INTERNAL_ERROR');
        expect(err.details).toBeNull();
    });

    it('is an instance of Error', () => {
        expect(new AppError('x')).toBeInstanceOf(Error);
    });

    it('sets name to constructor name', () => {
        expect(new AppError('x').name).toBe('AppError');
    });

    it('captures a stack trace', () => {
        expect(new AppError('x').stack).toBeTruthy();
    });
});

// ---------------------------------------------------------------------------
// http.errors.js
// ---------------------------------------------------------------------------

describe('ValidationError', () => {
    it('defaults to 400 / VALIDATION_ERROR', () => {
        const err = new ValidationError();
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe('VALIDATION_ERROR');
    });

    it('accepts custom message and details', () => {
        const err = new ValidationError('bad input', { field: 'email' });
        expect(err.message).toBe('bad input');
        expect(err.details).toEqual({ field: 'email' });
    });

    it('extends AppError', () => {
        expect(new ValidationError()).toBeInstanceOf(AppError);
    });
});

describe('ConflictError', () => {
    it('defaults to 409 / CONFLICT', () => {
        const err = new ConflictError();
        expect(err.statusCode).toBe(409);
        expect(err.code).toBe('CONFLICT');
    });

    it('accepts a custom message', () => {
        const err = new ConflictError('already exists');
        expect(err.message).toBe('already exists');
    });
});

describe('ForbiddenError', () => {
    it('defaults to 401 / UNAUTHORIZED', () => {
        const err = new ForbiddenError();
        expect(err.statusCode).toBe(401);
        expect(err.code).toBe('UNAUTHORIZED');
    });
});

describe('BusinessRuleError', () => {
    it('defaults to 422 / BUSINESS_RULE_VIOLAITON', () => {
        const err = new BusinessRuleError();
        expect(err.statusCode).toBe(422);
        expect(err.code).toBe('BUSINESS_RULE_VIOLAITON');
    });

    it('accepts message and details', () => {
        const err = new BusinessRuleError('rule broken', { rule: 'X' });
        expect(err.message).toBe('rule broken');
        expect(err.details).toEqual({ rule: 'X' });
    });
});

describe('InfrastructureError', () => {
    it('defaults to 500 / INFRASTRUCTURE_ERROR', () => {
        const err = new InfrastructureError();
        expect(err.statusCode).toBe(500);
        expect(err.code).toBe('INFRASTRUCTURE_ERROR');
    });
});

describe('InternaslServerErrror (typo class)', () => {
    it('defaults to 500 / INTERNAL_ERROR', () => {
        const err = new InternaslServerErrror();
        expect(err.statusCode).toBe(500);
        expect(err.code).toBe('INTERNAL_ERROR');
    });
});

describe('NotFoundError', () => {
    it('defaults to 404 / NOT_FOUND', () => {
        const err = new NotFoundError();
        expect(err.statusCode).toBe(404);
        expect(err.code).toBe('NOT_FOUND');
    });

    it('accepts message and details', () => {
        const err = new NotFoundError('gone', { id: 42 });
        expect(err.message).toBe('gone');
        expect(err.details).toEqual({ id: 42 });
    });
});

describe('UnauthorizedError', () => {
    it('defaults to 401 / UNAUTHORIZED', () => {
        const err = new UnauthorizedError();
        expect(err.statusCode).toBe(401);
        expect(err.code).toBe('UNAUTHORIZED');
    });
});

// ---------------------------------------------------------------------------
// task.errors.js – Not Found
// ---------------------------------------------------------------------------

describe('TaskNotFoundError', () => {
    it('extends NotFoundError', () => {
        expect(new TaskNotFoundError('abc')).toBeInstanceOf(NotFoundError);
    });

    it('includes the id in the message', () => {
        expect(new TaskNotFoundError('abc').message).toContain('abc');
    });

    it('has code TASK_NOT_FOUND', () => {
        expect(new TaskNotFoundError('1').code).toBe('TASK_NOT_FOUND');
    });

    it('has statusCode 404', () => {
        expect(new TaskNotFoundError('1').statusCode).toBe(404);
    });
});

// ---------------------------------------------------------------------------
// task.errors.js – Validation
// ---------------------------------------------------------------------------

describe('TaskValidationError', () => {
    it('extends ValidationError', () => {
        expect(new TaskValidationError('x')).toBeInstanceOf(ValidationError);
    });

    it('has code TASK_VALIDATION_ERROR', () => {
        expect(new TaskValidationError('x').code).toBe('TASK_VALIDATION_ERROR');
    });

    it('passes details through', () => {
        const err = new TaskValidationError('x', { field: 'title' });
        expect(err.details).toEqual({ field: 'title' });
    });
});

describe('TaskTitleRequiredError', () => {
    it('has code TASK_TITLE_REQUIRED', () => {
        expect(new TaskTitleRequiredError().code).toBe('TASK_TITLE_REQUIRED');
    });

    it('message mentions title', () => {
        expect(new TaskTitleRequiredError().message).toContain('title');
    });
});

describe('TaskTitleTooShortError', () => {
    it('uses default minLength of 3', () => {
        expect(new TaskTitleTooShortError().message).toContain('3');
    });

    it('uses custom minLength', () => {
        expect(new TaskTitleTooShortError(5).message).toContain('5');
    });

    it('has code TASK_TITLE_TOO_SHORT', () => {
        expect(new TaskTitleTooShortError().code).toBe('TASK_TITLE_TOO_SHORT');
    });
});

describe('TaskTitleTooLongError', () => {
    it('uses default maxLength of 100', () => {
        expect(new TaskTitleTooLongError().message).toContain('100');
    });

    it('has code TASK_TITLE_TOO_LONG', () => {
        expect(new TaskTitleTooLongError().code).toBe('TASK_TITLE_TOO_LONG');
    });
});

describe('TaskInvalidStatusError', () => {
    it('includes the invalid status in the message', () => {
        expect(new TaskInvalidStatusError('BOGUS').message).toContain('BOGUS');
    });

    it('has code TASK_INVALID_STATUS', () => {
        expect(new TaskInvalidStatusError('X').code).toBe('TASK_INVALID_STATUS');
    });
});

describe('TaskInvalidPriorityError', () => {
    it('includes the invalid priority in the message', () => {
        expect(new TaskInvalidPriorityError('ULTRA').message).toContain('ULTRA');
    });

    it('has code TASK_INVALID_PRIORITY', () => {
        expect(new TaskInvalidPriorityError('X').code).toBe('TASK_INVALID_PRIORITY');
    });
});

describe('TaskInvalidDueDateError', () => {
    it('includes the bad date in the message', () => {
        expect(new TaskInvalidDueDateError('not-a-date').message).toContain('not-a-date');
    });

    it('has code TASK_INVALID_DUE_DATE', () => {
        expect(new TaskInvalidDueDateError('x').code).toBe('TASK_INVALID_DUE_DATE');
    });
});

describe('TaskDueDateInPastError', () => {
    it('has code TASK_DUE_DATE_PAST', () => {
        expect(new TaskDueDateInPastError().code).toBe('TASK_DUE_DATE_PAST');
    });

    it('message mentions past', () => {
        expect(new TaskDueDateInPastError().message).toContain('past');
    });
});

describe('TaskUserIdRequiredError', () => {
    it('has code TASK_USER_ID_REQUIRED', () => {
        expect(new TaskUserIdRequiredError().code).toBe('TASK_USER_ID_REQUIRED');
    });
});

describe('TaskInvalidUserIdError', () => {
    it('includes the user id in the message', () => {
        expect(new TaskInvalidUserIdError('bad-uid').message).toContain('bad-uid');
    });

    it('has code TASK_INVALID_USER_ID', () => {
        expect(new TaskInvalidUserIdError('x').code).toBe('TASK_INVALID_USER_ID');
    });
});

describe('TaskExtraFieldsError', () => {
    it('lists all unexpected fields in the message', () => {
        const err = new TaskExtraFieldsError(['foo', 'bar']);
        expect(err.message).toContain('foo');
        expect(err.message).toContain('bar');
    });

    it('has code TASK_EXTRA_FIELDS', () => {
        expect(new TaskExtraFieldsError(['x']).code).toBe('TASK_EXTRA_FIELDS');
    });
});

// ---------------------------------------------------------------------------
// task.errors.js – Business Rules
// ---------------------------------------------------------------------------

describe('TaskAlreadyCompletedError', () => {
    it('extends BusinessRuleError', () => {
        expect(new TaskAlreadyCompletedError()).toBeInstanceOf(BusinessRuleError);
    });

    it('has code TASK_ALREADY_COMPLETED', () => {
        expect(new TaskAlreadyCompletedError().code).toBe('TASK_ALREADY_COMPLETED');
    });

    it('has statusCode 422', () => {
        expect(new TaskAlreadyCompletedError().statusCode).toBe(422);
    });
});

describe('TaskNotInProgressError', () => {
    it('has code TASK_NOT_IN_PROGRESS', () => {
        expect(new TaskNotInProgressError().code).toBe('TASK_NOT_IN_PROGRESS');
    });
});

describe('TaskNotPendingError', () => {
    it('has code TASK_NOT_PENDING', () => {
        expect(new TaskNotPendingError().code).toBe('TASK_NOT_PENDING');
    });
});

describe('TaskCannotEditDeletedError', () => {
    it('has code TASK_CANNOT_EDIT_DELETED', () => {
        expect(new TaskCannotEditDeletedError().code).toBe('TASK_CANNOT_EDIT_DELETED');
    });
});

describe('TaskDueDateChangeAfterCompletionError', () => {
    it('has code TASK_DUE_DATE_CHANGE_FORBIDDEN', () => {
        expect(new TaskDueDateChangeAfterCompletionError().code).toBe('TASK_DUE_DATE_CHANGE_FORBIDDEN');
    });
});

// ---------------------------------------------------------------------------
// task.errors.js – Ownership & Conflict
// ---------------------------------------------------------------------------

describe('TaskOwnershipError', () => {
    it('extends ForbiddenError', () => {
        expect(new TaskOwnershipError('u1', 't1')).toBeInstanceOf(ForbiddenError);
    });

    it('includes userId and taskId in message', () => {
        const err = new TaskOwnershipError('u1', 't1');
        expect(err.message).toContain('u1');
        expect(err.message).toContain('t1');
    });

    it('has code TASK_OWNERSHIP_ERROR', () => {
        expect(new TaskOwnershipError('u', 't').code).toBe('TASK_OWNERSHIP_ERROR');
    });
});

describe('TaskDuplicateTitleError', () => {
    it('extends ConflictError', () => {
        expect(new TaskDuplicateTitleError('My Task')).toBeInstanceOf(ConflictError);
    });

    it('includes the title in the message', () => {
        expect(new TaskDuplicateTitleError('My Task').message).toContain('My Task');
    });

    it('has code TASK_DUPLICATE_TITLE', () => {
        expect(new TaskDuplicateTitleError('x').code).toBe('TASK_DUPLICATE_TITLE');
    });
});

describe('TaskInvalidIdError', () => {
    it('is an instance of Error', () => {
        expect(new TaskInvalidIdError()).toBeInstanceOf(Error);
    });

    it('has default message', () => {
        expect(new TaskInvalidIdError().message).toBe('Invalid task ID');
    });

    it('accepts a custom message', () => {
        expect(new TaskInvalidIdError('nope').message).toBe('nope');
    });

    it('has code "Invalid task Error"', () => {
        // NOTE: the code string has a typo in the source – tested as-is
        expect(new TaskInvalidIdError().code).toBe('Invalid task Error');
    });
});

// ---------------------------------------------------------------------------
// user.errors.js – Not Found
// ---------------------------------------------------------------------------

describe('UserNotFoundError', () => {
    it('extends NotFoundError', () => {
        expect(new UserNotFoundError('123')).toBeInstanceOf(NotFoundError);
    });

    it('includes id in message', () => {
        expect(new UserNotFoundError('123').message).toContain('123');
    });

    it('has code USER_NOT_FOUND', () => {
        expect(new UserNotFoundError('1').code).toBe('USER_NOT_FOUND');
    });
});

describe('UserEmailNotFoundError', () => {
    it('includes email in message', () => {
        expect(new UserEmailNotFoundError('a@b.com').message).toContain('a@b.com');
    });

    it('has code USER_EMAIL_NOT_FOUND', () => {
        expect(new UserEmailNotFoundError('x').code).toBe('USER_EMAIL_NOT_FOUND');
    });
});

// ---------------------------------------------------------------------------
// user.errors.js – Validation
// ---------------------------------------------------------------------------

describe('UserValidationError', () => {
    it('extends ValidationError', () => {
        expect(new UserValidationError('x')).toBeInstanceOf(ValidationError);
    });

    it('has code USER_VALIDATION_ERROR', () => {
        expect(new UserValidationError('x').code).toBe('USER_VALIDATION_ERROR');
    });
});

describe('UserNameRequiredError', () => {
    it('has code USER_NAME_REQUIRED', () => {
        expect(new UserNameRequiredError().code).toBe('USER_NAME_REQUIRED');
    });
});

describe('UserNameTooShortError', () => {
    it('defaults to minLength 3', () => {
        expect(new UserNameTooShortError().message).toContain('3');
    });

    it('uses custom minLength', () => {
        expect(new UserNameTooShortError(2).message).toContain('2');
    });
});

describe('UserNameTooLongError', () => {
    it('defaults to maxLength 100', () => {
        expect(new UserNameTooLongError().message).toContain('100');
    });
});

describe('UserInvalidEmailError', () => {
    it('includes the bad email in the message', () => {
        expect(new UserInvalidEmailError('not-email').message).toContain('not-email');
    });

    it('has code USER_INVALID_EMAIL', () => {
        expect(new UserInvalidEmailError('x').code).toBe('USER_INVALID_EMAIL');
    });
});

describe('UserPasswordTooWeakError', () => {
    it('defaults to minLength 8', () => {
        expect(new UserPasswordTooWeakError().message).toContain('8');
    });

    it('has code USER_PASSWORD_TOO_WEAK', () => {
        expect(new UserPasswordTooWeakError().code).toBe('USER_PASSWORD_TOO_WEAK');
    });
});

describe('UserInvalidRoleError', () => {
    it('includes the invalid role in the message', () => {
        expect(new UserInvalidRoleError('SUPERUSER').message).toContain('SUPERUSER');
    });

    it('has code USER_INVALID_ROLE', () => {
        expect(new UserInvalidRoleError('X').code).toBe('USER_INVALID_ROLE');
    });
});

// ---------------------------------------------------------------------------
// user.errors.js – Business Rules
// ---------------------------------------------------------------------------

describe('UserAlreadyAdminError', () => {
    it('extends BusinessRuleError', () => {
        expect(new UserAlreadyAdminError()).toBeInstanceOf(BusinessRuleError);
    });

    it('has code USER_ALREADY_ADMIN', () => {
        expect(new UserAlreadyAdminError().code).toBe('USER_ALREADY_ADMIN');
    });

    it('has statusCode 422', () => {
        expect(new UserAlreadyAdminError().statusCode).toBe(422);
    });
});

// ---------------------------------------------------------------------------
// user.errors.js – Conflict
// ---------------------------------------------------------------------------

describe('UserEmailAlreadyExistsError', () => {
    it('extends ConflictError', () => {
        expect(new UserEmailAlreadyExistsError('a@b.com')).toBeInstanceOf(ConflictError);
    });

    it('includes email in message', () => {
        expect(new UserEmailAlreadyExistsError('a@b.com').message).toContain('a@b.com');
    });

    it('has code USER_EMAIL_ALREADY_EXISTS', () => {
        expect(new UserEmailAlreadyExistsError('x').code).toBe('USER_EMAIL_ALREADY_EXISTS');
    });

    it('has statusCode 409', () => {
        expect(new UserEmailAlreadyExistsError('x').statusCode).toBe(409);
    });
});

// ---------------------------------------------------------------------------
// user.errors.js – Auth
// ---------------------------------------------------------------------------

describe('InvalidCredentialsError', () => {
    it('extends UnauthorizedError', () => {
        expect(new InvalidCredentialsError()).toBeInstanceOf(UnauthorizedError);
    });

    it('has code INVALID_CREDENTIALS', () => {
        expect(new InvalidCredentialsError().code).toBe('INVALID_CREDENTIALS');
    });

    it('has statusCode 401', () => {
        expect(new InvalidCredentialsError().statusCode).toBe(401);
    });
});

describe('UserNotAuthenticatedError', () => {
    it('has code USER_NOT_AUTHENTICATED', () => {
        expect(new UserNotAuthenticatedError().code).toBe('USER_NOT_AUTHENTICATED');
    });

    it('has statusCode 401', () => {
        expect(new UserNotAuthenticatedError().statusCode).toBe(401);
    });
});

describe('UserInsufficientPermissionError', () => {
    it('extends ForbiddenError', () => {
        expect(new UserInsufficientPermissionError('admin')).toBeInstanceOf(ForbiddenError);
    });

    it('includes required role in message', () => {
        expect(new UserInsufficientPermissionError('admin').message).toContain('admin');
    });

    it('has code USER_INSUFFICIENT_PERMISSION', () => {
        expect(new UserInsufficientPermissionError('admin').code).toBe('USER_INSUFFICIENT_PERMISSION');
    });
});