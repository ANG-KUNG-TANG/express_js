// src/domain/entities/content_flag_entity.js

export const FlagSeverity = Object.freeze({
    LOW:    'low',
    MEDIUM: 'medium',
    HIGH:   'high',
});

export const FlagStatus = Object.freeze({
    OPEN:     'open',
    RESOLVED: 'resolved',
});

// Guard token for private constructor
const _GUARD = Symbol('ContentFlag.constructor.guard');

export class ContentFlag {
    #id;
    #taskId;
    #taskTitle;
    #flaggedBy;
    #reason;
    #severity;
    #status;
    #resolvedBy;
    #resolvedAt;
    #createdAt;
    #updatedAt;

    constructor(props, guard) {
        if (guard !== _GUARD) {
            throw new Error('Use static factory methods to create ContentFlag');
        }

        this.#id         = props.id;
        this.#taskId     = props.taskId;
        this.#taskTitle  = props.taskTitle || null;
        this.#flaggedBy  = props.flaggedBy;
        this.#reason     = props.reason;
        this.#severity   = props.severity || FlagSeverity.MEDIUM;
        this.#status     = props.status || FlagStatus.OPEN;
        this.#resolvedBy = props.resolvedBy || null;
        this.#resolvedAt = props.resolvedAt || null;
        this.#createdAt  = props.createdAt || new Date();
        this.#updatedAt  = props.updatedAt || new Date();
    }

    // Static Factory for new flags
    static create({ taskId, flaggedBy, reason, severity }) {
        if (!taskId || !flaggedBy || !reason) {
            throw new Error('Missing required fields for ContentFlag');
        }
        return new ContentFlag({ taskId, flaggedBy, reason, severity }, _GUARD);
    }

    // Static Factory for DB hydration
    static reconstitute(props) {
        return new ContentFlag(props, _GUARD);
    }

    // Getters
    get id()         { return this.#id; }
    get taskId()     { return this.#taskId; }
    get taskTitle()  { return this.#taskTitle; }
    get flaggedBy()  { return this.#flaggedBy; }
    get reason()     { return this.#reason; }
    get severity()   { return this.#severity; }
    get status()     { return this.#status; }
    get resolvedBy() { return this.#resolvedBy; }
    get resolvedAt() { return this.#resolvedAt; }
    get createdAt()  { return this.#createdAt; }
    get updatedAt()  { return this.#updatedAt; }

    // Domain Logic
    isResolved() { return this.#status === FlagStatus.RESOLVED; }

    resolve(adminId) {
        if (this.isResolved()) {
            throw new Error('Flag is already resolved');
        }
        this.#status     = FlagStatus.RESOLVED;
        this.#resolvedBy = adminId;
        this.#resolvedAt = new Date();
        this.#updatedAt  = new Date();
    }
}