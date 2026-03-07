// domain/entities/password_reset_token_entity.js
// Mirrors user_entity.js: private fields, _initialize(), typed error throws, getters

import { UniqueId } from '../base/id_generator.js';
import {
    PasswordResetTokenExpiredError,
    PasswordResetTokenAlreadyUsedError,
} from '../../core/errors/password_reset.errors.js';

export class PasswordResetToken {
    constructor(props) {
        this._initialize(props);
    }

    _initialize({ id, userId, tokenHash, expiresAt, used = false, createdAt = new Date() }) {
        this._validateUserId(userId);
        this._validateTokenHash(tokenHash);
        this._validateExpiresAt(expiresAt);

        this._id        = id || new UniqueId().generator();
        this._userId    = userId;
        this._tokenHash = tokenHash;
        this._expiresAt = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
        this._used      = used;
        this._createdAt = createdAt;
    }

    _validateUserId(userId) {
        if (!userId) throw new Error('PasswordResetToken: userId is required');
    }

    _validateTokenHash(tokenHash) {
        if (!tokenHash) throw new Error('PasswordResetToken: tokenHash is required');
    }

    _validateExpiresAt(expiresAt) {
        if (!expiresAt) throw new Error('PasswordResetToken: expiresAt is required');
    }

    /** Call this before using the token. Throws a typed domain error if invalid. */
    assertValid() {
        if (this._used)                   throw new PasswordResetTokenAlreadyUsedError();
        if (new Date() > this._expiresAt) throw new PasswordResetTokenExpiredError();
    }

    markUsed() {
        this._used = true;
    }

    get id()        { return this._id; }
    get userId()    { return this._userId; }
    get tokenHash() { return this._tokenHash; }
    get expiresAt() { return this._expiresAt; }
    get used()      { return this._used; }
    get createdAt() { return this._createdAt; }
}