// src/domain/entities/audit_log_entity.js

export class AuditLog {
    #id;
    #action;
    #outcome;
    #requesterId;
    #actorLabel;
    #details;
    #request;
    #createdAt;

    constructor({
        id,
        action,
        outcome     = 'success',
        requesterId = null,
        actorLabel  = null,
        details     = {},
        request     = null,
        createdAt   = new Date(),
    }) {
        AuditLog.#validate({ action, outcome });

        this.#id          = id ?? null;
        this.#action      = action;
        this.#outcome     = outcome;
        this.#requesterId = requesterId;
        this.#actorLabel  = actorLabel;
        this.#details     = Object.freeze({ ...details });       // shallow-freeze a copy
        this.#request     = request ? Object.freeze({ ...request }) : null;
        this.#createdAt   = createdAt instanceof Date ? createdAt : new Date(createdAt);
    }

    // ── private static validation ─────────────────────────────────────────────

    static #VALID_OUTCOMES = Object.freeze(['success', 'failure']);

    static #validate({ action, outcome }) {
        if (!action || typeof action !== 'string') {
            throw new Error('AuditLog: action is required and must be a string');
        }
        if (!AuditLog.#VALID_OUTCOMES.includes(outcome)) {
            throw new Error(`AuditLog: outcome must be one of ${AuditLog.#VALID_OUTCOMES.join(', ')}, got "${outcome}"`);
        }
    }

    // ── getters ───────────────────────────────────────────────────────────────

    get id()          { return this.#id; }
    get action()      { return this.#action; }
    get outcome()     { return this.#outcome; }
    get requesterId() { return this.#requesterId; }
    get actorLabel()  { return this.#actorLabel ?? this.#requesterId; }
    get details()     { return this.#details; }
    get request()     { return this.#request; }
    get createdAt()   { return new Date(this.#createdAt); } // defensive copy

    // ── serialisation ─────────────────────────────────────────────────────────

    toJSON() {
        return {
            id:          this.#id,
            action:      this.#action,
            outcome:     this.#outcome,
            requesterId: this.#requesterId,
            actorLabel:  this.#actorLabel ?? this.#requesterId,
            details:     { ...this.#details },
            request:     this.#request ? { ...this.#request } : null,
            createdAt:   this.#createdAt,
        };
    }
}