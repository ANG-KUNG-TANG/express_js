// core/errors/auth.errors.js
// Add these classes to your existing auth/user errors file,
// or create this file if you don't have one yet.

export class RefreshTokenExpiredError extends Error {
    constructor() {
        super('Refresh token has expired. Please log in again.');
        this.name    = 'RefreshTokenExpiredError';
        this.status  = 401;
    }
}

export class RefreshTokenRevokedError extends Error {
    constructor() {
        super('Refresh token has been revoked. Please log in again.');
        this.name    = 'RefreshTokenRevokedError';
        this.status  = 401;
    }
}

export class RefreshTokenNotFoundError extends Error {
    constructor() {
        super('Refresh token not found.');
        this.name    = 'RefreshTokenNotFoundError';
        this.status  = 401;
    }
}