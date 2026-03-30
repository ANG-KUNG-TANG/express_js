
export class AuditLog {
    constructor({
        id,
        action,
        outcome     = 'success',
        requesterId = null,
        details     = {},
        request     = null,       // { method, path, ip, userAgent, requestId }
        createdAt   = new Date(),
    }) {
        this._id          = id;
        this._action      = action;
        this._outcome     = outcome;
        this._requesterId = requesterId;
        this._details     = details;
        this._request     = request;
        this._createdAt   = createdAt;
    }

    get id()          { return this._id; }
    get action()      { return this._action; }
    get outcome()     { return this._outcome; }
    get requesterId() { return this._requesterId; }
    get details()     { return this._details; }
    get request()     { return this._request; }
    get createdAt()   { return this._createdAt; }
}