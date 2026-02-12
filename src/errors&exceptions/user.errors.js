import { 
    NotFoundError, 
    ValidationError, 
    BusinessRuleError, 
    ConflictError,
    ForbiddenError,
    UnauthorizedError
} from './http.errors.js';

// ------------------------------------------------------------------
// Not Found
// ------------------------------------------------------------------
export class UserNotFoundError extends NotFoundError {
    constructor(id) {
        super(`User with id ${id}`);
        this.code = 'USER_NOT_FOUND';
    }
}

export class UserEmailNotFoundError extends NotFoundError {
    constructor(email) {
        super(`User with email ${email}`);
        this.code = 'USER_EMAIL_NOT_FOUND';
    }
}

// ------------------------------------------------------------------
// Validation
// ------------------------------------------------------------------
export class UserValidationError extends ValidationError {
    constructor(message, details = null) {
        super(message, details);
        this.code = 'USER_VALIDATION_ERROR';
    }
}

export class UserNameRequiredError extends UserValidationError {
    constructor() {
        super('Name is required');
        this.code = 'USER_NAME_REQUIRED';
    }
}

export class UserNameTooShortError extends UserValidationError {
    constructor(minLength = 3) {
        super(`Name must be at least ${minLength} characters`);
        this.code = 'USER_NAME_TOO_SHORT';
    }
}

export class UserNameTooLongError extends UserValidationError {
    constructor(maxLength = 100) {
        super(`Name cannot exceed ${maxLength} characters`);
        this.code = 'USER_NAME_TOO_LONG';
    }
}

export class UserInvalidEmailError extends UserValidationError {
    constructor(email) {
        super(`Invalid email format: ${email}`);
        this.code = 'USER_INVALID_EMAIL';
    }
}

export class UserPasswordTooWeakError extends UserValidationError {
    constructor(minLength = 8) {
        super(`Password must be at least ${minLength} characters`);
        this.code = 'USER_PASSWORD_TOO_WEAK';
    }
}

export class UserInvalidRoleError extends UserValidationError {
    constructor(role) {
        super(`Invalid user role: ${role}`);
        this.code = 'USER_INVALID_ROLE';
    }
}

// ------------------------------------------------------------------
// Business Rule Violations
// ------------------------------------------------------------------
export class UserBusinessRuleError extends BusinessRuleError {
    constructor(message, rule = null) {
        super(message, { rule });
        this.code = 'USER_BUSINESS_RULE_VIOLATION';
    }
}

export class UserAlreadyAdminError extends UserBusinessRuleError {
    constructor() {
        super('User is already an admin', 'USER_ALREADY_ADMIN');
        this.code = 'USER_ALREADY_ADMIN';
    }
}

// ------------------------------------------------------------------
// Conflict
// ------------------------------------------------------------------
export class UserEmailAlreadyExistsError extends ConflictError {
    constructor(email) {
        super(`Email ${email} is already registered`);
        this.code = 'USER_EMAIL_ALREADY_EXISTS';
    }
}

// ------------------------------------------------------------------
// Authentication / Authorization
// ------------------------------------------------------------------
export class InvalidCredentialsError extends UnauthorizedError {
    constructor() {
        super('Invalid email or password');
        this.code = 'INVALID_CREDENTIALS';
    }
}

export class UserNotAuthenticatedError extends UnauthorizedError {
    constructor() {
        super('Authentication required');
        this.code = 'USER_NOT_AUTHENTICATED';
    }
}

export class UserInsufficientPermissionError extends ForbiddenError {
    constructor(requiredRole) {
        super(`Insufficient permissions. Required role: ${requiredRole}`);
        this.code = 'USER_INSUFFICIENT_PERMISSION';
    }
}