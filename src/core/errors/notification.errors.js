// core/errors/notification.errors.js

export class NotificationInvalidTypeError extends Error {
    constructor(type) {
        super(`Invalid notification type: "${type}".`);
        this.name       = 'NotificationInvalidTypeError';
        this.statusCode = 400;
    }
}

export class NotificationMissingFieldError extends Error {
    constructor(field) {
        super(`Notification is missing required field: "${field}".`);
        this.name       = 'NotificationMissingFieldError';
        this.statusCode = 400;
    }
}

export class NotificationNotFoundError extends Error {
    constructor(id) {
        super(`Notification "${id}" not found.`);
        this.name       = 'NotificationNotFoundError';
        this.statusCode = 404;
    }
}