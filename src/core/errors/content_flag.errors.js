// src/core/errors/content_flag.errors.js
// Follows the same pattern as task.errors.js and user.errors.js

export class ContentFlagNotFoundError extends Error {
    constructor(id) {
        super(`Content flag not found: ${id}`);
        this.name       = 'ContentFlagNotFoundError';
        this.statusCode = 404;
    }
}

export class ContentFlagInvalidIdError extends Error {
    constructor(id) {
        super(`Invalid content flag id: ${id}`);
        this.name       = 'ContentFlagInvalidIdError';
        this.statusCode = 400;
    }
}

export class ContentFlagInvalidTaskIdError extends Error {
    constructor(id) {
        super(`Invalid task id for flagging: ${id}`);
        this.name       = 'ContentFlagInvalidTaskIdError';
        this.statusCode = 400;
    }
}

export class ContentFlagAlreadyResolvedError extends Error {
    constructor(id) {
        super(`Content flag already resolved: ${id}`);
        this.name       = 'ContentFlagAlreadyResolvedError';
        this.statusCode = 409;
    }
}

export class ContentFlagValidationError extends Error {
    constructor(message) {
        super(message);
        this.name       = 'ContentFlagValidationError';
        this.statusCode = 422;
    }
}