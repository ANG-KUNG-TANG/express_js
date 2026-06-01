// domain/entities/password_reset_token_entity.js

import { UniqueId } from '../base/id_generator.js';
import {
    PasswordResetTokenExpiredError,
    PasswordResetTokenAlreadyUsedError,
} from '../../core/errors/password_reset.errors.js';

export class PasswordResetToken {
    #id;
    #userId;
    #tokenHash;
    #expiresAt;
    #used;
    #createdAt;

    constructor(props) {
        this.#initialize(props);
    }

    #initialize({ id, userId, tokenHash, expiresAt, used = false, createdAt = new Date() }) {
        PasswordResetToken.#validateUserId(userId);
        PasswordResetToken.#validateTokenHash(tokenHash);
        PasswordResetToken.#validateExpiresAt(expiresAt);

        this.#id        = id || new UniqueId().generator();
        this.#userId    = userId;
        this.#tokenHash = tokenHash;
        this.#expiresAt = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
        this.#used      = Boolean(used);
        this.#createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
    }

    // ── private static validators ─────────────────────────────────────────────

    static #validateUserId(userId) {
        if (!userId) throw new Error('PasswordResetToken: userId is required');
    }

    static #validateTokenHash(tokenHash) {
        if (!tokenHash) throw new Error('PasswordResetToken: tokenHash is required');
    }

    static #validateExpiresAt(expiresAt) {
        if (!expiresAt) throw new Error('PasswordResetToken: expiresAt is required');
    }

    // ── domain behaviour ──────────────────────────────────────────────────────

    assertValid() {
        if (this.#used)                   throw new PasswordResetTokenAlreadyUsedError();
        if (new Date() > this.#expiresAt) throw new PasswordResetTokenExpiredError();
    }

    markUsed() {
        if (this.#used) throw new PasswordResetTokenAlreadyUsedError(); // guard double-use
        this.#used = true;
    }

    get isExpired() { return new Date() > this.#expiresAt; }
    get isUsed()    { return this.#used; }

    // ── getters ───────────────────────────────────────────────────────────────

    get id()        { return this.#id; }
    get userId()    { return this.#userId; }
    get tokenHash() { return this.#tokenHash; }
    get expiresAt() { return new Date(this.#expiresAt); } // defensive copy
    get used()      { return this.#used; }
    get createdAt() { return new Date(this.#createdAt); } // defensive copy

    // ── serialisation ─────────────────────────────────────────────────────────

    toJSON() {
        return {
            id:        this.#id,
            userId:    this.#userId,
            tokenHash: this.#tokenHash,
            expiresAt: this.#expiresAt,
            used:      this.#used,
            createdAt: this.#createdAt,
        };
    }
}