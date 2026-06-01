// src/domain/entities/notification_entity.js

import { UniqueId } from '../base/id_generator.js';
import {
    NotificationInvalidTypeError,
    NotificationMissingFieldError,
} from '../../core/errors/notification.errors.js';
import { NotificationType } from '../base/noti_enums.js';

export { NotificationType };

// Guard token for private constructor
const _GUARD = Symbol('Notification.constructor.guard');

export class Notification {
    #id;
    #userId;
    #type;
    #title;
    #message;
    #isRead;
    #metadata;
    #createdAt;
    #updatedAt;

    constructor(props, guard) {
        if (guard !== _GUARD) {
            throw new Error('Use static factory methods to create Notification');
        }

        this.#id        = props.id;
        this.#userId    = props.userId;
        this.#type      = props.type;
        this.#title     = props.title;
        this.#message   = props.message;
        this.#isRead    = props.isRead ?? false;
        this.#metadata  = props.metadata ?? null;
        this.#createdAt = props.createdAt ?? new Date();
        this.#updatedAt = props.updatedAt ?? new Date();
    }

    // Static Factory for creating new notifications
    static create({ userId, type, title, message, metadata = null }) {
        if (!Object.values(NotificationType).includes(type)) {
            throw new NotificationInvalidTypeError(type);
        }
        if (!userId) throw new NotificationMissingFieldError('userId');
        if (!title)  throw new NotificationMissingFieldError('title');
        if (!message) throw new NotificationMissingFieldError('message');

        return new Notification({
            id: new UniqueId().generator(),
            userId,
            type,
            title,
            message,
            metadata
        }, _GUARD);
    }

    // Static Factory for DB hydration
    static reconstitute(props) {
        return new Notification(props, _GUARD);
    }

    // Getters
    get id()        { return this.#id; }
    get userId()    { return this.#userId; }
    get type()      { return this.#type; }
    get title()     { return this.#title; }
    get message()   { return this.#message; }
    get isRead()    { return this.#isRead; }
    get metadata()  { return this.#metadata; }
    get createdAt() { return this.#createdAt; }
    get updatedAt() { return this.#updatedAt; }

    // Domain Logic
    markRead() {
        if (this.#isRead) return; // Idempotency
        this.#isRead    = true;
        this.#updatedAt = new Date();
    }

    toJSON() {
        return {
            id:        this.#id,
            userId:    this.#userId,
            type:      this.#type,
            title:     this.#title,
            message:   this.#message,
            isRead:    this.#isRead,
            metadata:  this.#metadata,
            createdAt: this.#createdAt,
            updatedAt: this.#updatedAt,
        };
    }
}