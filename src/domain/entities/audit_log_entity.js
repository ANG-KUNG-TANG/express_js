// src/domain/entities/audit_log_entity.js

export class AuditLog {
    constructor({
        id,
        action,
        outcome     = 'success',
        requesterId = null,
        actorLabel  = null,   // fix #4: display-friendly actor string (email or name)
                              //         populated by findLogs(), null in createLog() writes
        details     = {},
        request     = null,   // { method, path, ip, userAgent, requestId }
        createdAt   = new Date(),
    }) {
        this._id          = id;
        this._action      = action;
        this._outcome     = outcome;
        this._requesterId = requesterId;
        this._actorLabel  = actorLabel;
        this._details     = details;
        this._request     = request;
        this._createdAt   = createdAt;
    }

    get id()          { return this._id; }
    get action()      { return this._action; }
    get outcome()     { return this._outcome; }
    get requesterId() { return this._requesterId; }
    get actorLabel()  { return this._actorLabel ?? this._requesterId; }
    get details()     { return this._details; }
    get request()     { return this._request; }
    get createdAt()   { return this._createdAt; }

    /**
     * toJSON() is called automatically by JSON.stringify (and therefore by
     * Express res.json()). Without it, only the private _field own-properties
     * are serialized — the getter-defined public names are on the prototype
     * and are invisible to the serializer, so the frontend receives nothing.
     */
    toJSON() {
        return {
            id:          this._id,
            action:      this._action,
            outcome:     this._outcome,
            requesterId: this._requesterId,
            actorLabel:  this._actorLabel ?? this._requesterId,
            details:     this._details,
            request:     this._request,
            createdAt:   this._createdAt,
        };
    }
}