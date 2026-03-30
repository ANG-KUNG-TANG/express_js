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

export class ContentFlag {
    constructor({
        id,
        taskId,
        taskTitle     = null,
        flaggedBy,                  // admin userId
        reason,
        severity      = FlagSeverity.MEDIUM,
        status        = FlagStatus.OPEN,
        resolvedBy    = null,
        resolvedAt    = null,
        createdAt     = new Date(),
        updatedAt     = new Date(),
    }) {
        this._id         = id;
        this._taskId     = taskId;
        this._taskTitle  = taskTitle;
        this._flaggedBy  = flaggedBy;
        this._reason     = reason;
        this._severity   = severity;
        this._status     = status;
        this._resolvedBy = resolvedBy;
        this._resolvedAt = resolvedAt;
        this._createdAt  = createdAt;
        this._updatedAt  = updatedAt;
    }

    get id()         { return this._id; }
    get taskId()     { return this._taskId; }
    get taskTitle()  { return this._taskTitle; }
    get flaggedBy()  { return this._flaggedBy; }
    get reason()     { return this._reason; }
    get severity()   { return this._severity; }
    get status()     { return this._status; }
    get resolvedBy() { return this._resolvedBy; }
    get resolvedAt() { return this._resolvedAt; }
    get createdAt()  { return this._createdAt; }
    get updatedAt()  { return this._updatedAt; }

    isResolved() { return this._status === FlagStatus.RESOLVED; }
}