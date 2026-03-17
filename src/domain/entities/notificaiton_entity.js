// domain/entities/notification_entity.js

import { UniqueId } from '../base/id_generator.js';
import {
    NotificationInvalidTypeError,
    NotificationMissingFieldError,
} from '../../core/errors/notification.errors.js';

export const NotificationType = Object.freeze({
    // ── Existing types (unchanged) ────────────────────────────────────────────
    TEST_RESULT:      'test_result',
    EXAM_REMINDER:    'exam_reminder',
    SCORE_AVAILABLE:  'score_available',
    PRACTICE_READY:   'practice_ready',
    PASSWORD_CHANGED: 'password_changed',
    ACCOUNT_ALERT:    'account_alert',

    // ── Assignment types (new) ────────────────────────────────────────────────
    // Values are lowercase to match navbar.js TYPE_ICONS keys and the strings
    // passed into sendNotificationUseCase({ type: NotificationType.TASK_ASSIGNED })
    TASK_ASSIGNED:    'task_assigned',    // → student:  teacher assigned a task
    TASK_DECLINED:    'task_declined',    // → teacher:  student declined
    TASK_REMINDER:    'task_reminder',    // → student:  due in 24h (cron)
    TASK_UNSTARTED:   'task_unstarted',   // → student:  not started after X days (cron)
    TASK_SUBMITTED:   'task_submitted',   // → teacher:  student submitted
    TASK_SCORED:      'task_scored',      // → student:  teacher scored it
});

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
}