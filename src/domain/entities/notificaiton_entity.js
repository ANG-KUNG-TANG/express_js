// domain/entities/notification_entity.js

import { UniqueId } from '../base/id_generator.js';
import {
    NotificationInvalidTypeError,
    NotificationMissingFieldError,
} from '../../core/errors/notification.errors.js';
import { NotificationType } from '../base/noti_enums.js';

// FIX: re-export NotificationType from this file so any use case that
// mistakenly imports it from here still works without crashing.
// The correct import path is '../base/noti_enums.js' — but this re-export
// means you don't have to hunt down and fix every file that uses the wrong path.
export { NotificationType };

export class Notification {
    constructor(props) {
        this._initialize(props);
    }

    _initialize({
        id,
        userId,
        type,
        title,
        message,
        isRead    = false,
        metadata  = null,
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        this._validateType(type);
        this._validateRequired(userId,  'userId');
        this._validateRequired(title,   'title');
        this._validateRequired(message, 'message');

        this._id        = id || new UniqueId().generator();
        this._userId    = userId;
        this._type      = type;
        this._title     = title;
        this._message   = message;
        this._isRead    = isRead;
        this._metadata  = metadata;
        this._createdAt = createdAt;
        this._updatedAt = updatedAt;
    }

    _validateType(type) {
        if (!Object.values(NotificationType).includes(type))
            throw new NotificationInvalidTypeError(type);
    }

    _validateRequired(value, field) {
        if (!value) throw new NotificationMissingFieldError(field);
    }

    markRead() {
        this._isRead    = true;
        this._updatedAt = new Date();
    }

    get id()        { return this._id; }
    get userId()    { return this._userId; }
    get type()      { return this._type; }
    get title()     { return this._title; }
    get message()   { return this._message; }
    get isRead()    { return this._isRead; }
    get metadata()  { return this._metadata; }
    get createdAt() { return this._createdAt; }
    get updatedAt() { return this._updatedAt; }

    toJSON() {
        return {
            _id:       this._id,
            userId:    this._userId,
            type:      this._type,
            title:     this._title,
            message:   this._message,
            isRead:    this._isRead,      
            metadata:  this._metadata,   
            createdAt: this._createdAt, 
            updatedAt: this._updatedAt,  
        };
    }
}