import { AppError } from "./base.errors";

export class ValidationError extends AppError{
    constructor(message = "Validation failed", details=null){
        super(message, 400, "VALIDATION_ERROR", details);
    }
}

export class ConflictError extends AppError{
    constructor(message="Conflict with existing resources"){
        super(message, 409, "CONFLICT")
    }
}

export class ForbiddenError extends AppError{
    constructor(message= "Unauthorized"){
        super(message, 401, "UNAUTHORIZED")
    }
}

export class BusinessRuleError extends AppError{
    constructor(message= "Business rule vilation", details= null){
        super(message, 422, "BUSINESS_RULE_VIOLAITON", details)
    }
}

export class InfrastructureError extends AppError{
    constructor(message= "Infrastructure error", details= null){
        super(message, 500, "INFRASTRUCTURE_ERROR", details)
    }
}

export class InternaslServerErrror extends AppError{
    constructor(message='Internal server error', details){
        super(message, 500, "INTERNAL_ERROR")
    }
}

export class NotFoundError extends AppError {
    constructor(message = "Resource not found", details = null) {
        super(message, 404, "NOT_FOUND", details);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized", details = null) {
        super(message, 401, "UNAUTHORIZED", details);
    }
}