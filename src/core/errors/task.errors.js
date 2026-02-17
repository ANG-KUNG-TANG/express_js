import { 
    NotFoundError, 
    ValidationError, 
    BusinessRuleError, 
    ForbiddenError,
    ConflictError 
} from './http.errors.js';

// ------------------------------------------------------------------
// Not Found
// ------------------------------------------------------------------
export class TaskNotFoundError extends NotFoundError {
    constructor(id) {
        super(`Task with id ${id}`);
        this.code = 'TASK_NOT_FOUND';
    }
}

// ------------------------------------------------------------------
// Validation (Input Errors)
// ------------------------------------------------------------------
export class TaskValidationError extends ValidationError {
    constructor(message, details = null) {
        super(message, details);
        this.code = 'TASK_VALIDATION_ERROR';
    }
}

// Specific validation subclasses (optional but expressive)
export class TaskTitleRequiredError extends TaskValidationError {
    constructor() {
        super('Task title is required');
        this.code = 'TASK_TITLE_REQUIRED';
    }
}

export class TaskTitleTooShortError extends TaskValidationError {
    constructor(minLength = 3) {
        super(`Task title must be at least ${minLength} characters`);
        this.code = 'TASK_TITLE_TOO_SHORT';
    }
}

export class TaskTitleTooLongError extends TaskValidationError {
    constructor(maxLength = 100) {
        super(`Task title cannot exceed ${maxLength} characters`);
        this.code = 'TASK_TITLE_TOO_LONG';
    }
}

export class TaskInvalidStatusError extends TaskValidationError {
    constructor(status) {
        super(`Invalid task status: ${status}`);
        this.code = 'TASK_INVALID_STATUS';
    }
}

export class TaskInvalidPriorityError extends TaskValidationError {
    constructor(priority) {
        super(`Invalid task priority: ${priority}`);
        this.code = 'TASK_INVALID_PRIORITY';
    }
}

export class TaskInvalidDueDateError extends TaskValidationError {
    constructor(dueDate) {
        super(`Invalid due date format: ${dueDate}`);
        this.code = 'TASK_INVALID_DUE_DATE';
    }
}

export class TaskDueDateInPastError extends TaskValidationError {
    constructor() {
        super('Due date cannot be in the past');
        this.code = 'TASK_DUE_DATE_PAST';
    }
}

export class TaskUserIdRequiredError extends TaskValidationError {
    constructor() {
        super('Task must belong to a user');
        this.code = 'TASK_USER_ID_REQUIRED';
    }
}

export class TaskInvalidUserIdError extends TaskValidationError {
    constructor(userId) {
        super(`Invalid user ID format: ${userId}`);
        this.code = 'TASK_INVALID_USER_ID';
    }
}

export class TaskExtraFieldsError extends TaskValidationError {
    constructor(fields) {
        super(`Unexpected fields: ${fields.join(', ')}`);
        this.code = 'TASK_EXTRA_FIELDS';
    }
}

// ------------------------------------------------------------------
// Business Rule Violations (Domain Errors)
// ------------------------------------------------------------------
export class TaskBusinessRuleError extends BusinessRuleError {
    constructor(message, rule = null) {
        super(message, { rule });
        this.code = 'TASK_BUSINESS_RULE_VIOLATION';
    }
}

export class TaskAlreadyCompletedError extends TaskBusinessRuleError {
    constructor() {
        super('Task is already completed', 'TASK_ALREADY_COMPLETED');
        this.code = 'TASK_ALREADY_COMPLETED';
    }
}

export class TaskNotInProgressError extends TaskBusinessRuleError {
    constructor() {
        super('Only tasks in progress can be completed', 'TASK_NOT_IN_PROGRESS');
        this.code = 'TASK_NOT_IN_PROGRESS';
    }
}

export class TaskNotPendingError extends TaskBusinessRuleError {
    constructor() {
        super('Only pending tasks can be started', 'TASK_NOT_PENDING');
        this.code = 'TASK_NOT_PENDING';
    }
}

export class TaskCannotEditDeletedError extends TaskBusinessRuleError {
    constructor() {
        super('Cannot edit a deleted task', 'TASK_DELETED');
        this.code = 'TASK_CANNOT_EDIT_DELETED';
    }
}

export class TaskDueDateChangeAfterCompletionError extends TaskBusinessRuleError {
    constructor() {
        super('Cannot change due date of a completed task', 'TASK_DUE_DATE_CHANGE_AFTER_COMPLETION');
        this.code = 'TASK_DUE_DATE_CHANGE_FORBIDDEN';
    }
}

// ------------------------------------------------------------------
// Ownership Violations
// ------------------------------------------------------------------
export class TaskOwnershipError extends ForbiddenError {
    constructor(userId, taskId) {
        super(`User ${userId} does not own task ${taskId}`);
        this.code = 'TASK_OWNERSHIP_ERROR';
    }
}

// ------------------------------------------------------------------
// Conflict / Duplicate
// ------------------------------------------------------------------
export class TaskDuplicateTitleError extends ConflictError {
    constructor(title) {
        super(`Task with title "${title}" already exists`);
        this.code = 'TASK_DUPLICATE_TITLE';
    }
}

export class TaskInvalidIdError extends Error{
    constructor(message = 'Invalid task ID'){
        super(message);
        this.code = "Invalid task Error"
    }
}

