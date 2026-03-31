// core/services/notification.service.js
//
// ── Responsibility ────────────────────────────────────────────────────────────
//
//   Single entry point for all notification sending. Use cases call this
//   service — they never touch the socket, Redis, or repo directly.
//
// ── Usage from any use case ───────────────────────────────────────────────────
//
//   import { NotificationService } from '../../core/services/notification.service.js';
//
//   NotificationService.send({
//       recipientId: student._id,
//       actorId:     teacher._id,
//       type:        NotificationService.TYPES.TASK_ASSIGNED,
//       title:       'New task assigned',
//       message:     `${teacher.name} assigned "${task.title}" to you`,
//       refId:       task._id,
//       refModel:    'Task',
//   });

import { redisDel, CacheKeys }      from './redis.service.js';
import { sendNotificationUseCase }  from '../../app/notification/send_noti.uc.js';
import { NotificationType } from '../../domain/base/noti_enums.js';

// ── Core send function ────────────────────────────────────────────────────────

/**
 * Persist a notification, bust the recipient's Redis cache,
 * then push it in real time via Socket.IO.
 *
 * Fire-and-forget friendly — errors are caught and logged, never re-thrown.
 * All fields except recipientId, type, title, message are optional.
 *
 * @param {{
 *   recipientId : string,
 *   actorId?    : string,
 *   type        : string,   // use NotificationType constants above
 *   title       : string,
 *   message     : string,
 *   refId?      : string,
 *   refModel?   : string,
 * }} options
 */
const send = async ({ recipientId, actorId, type, title, message, refId, refModel }) => {
    try {
        // 1. Persist + emit socket event.
        //    sendNotificationUseCase handles both DB write and socket emit internally —
        //    do NOT emit again here to avoid double-firing notification:new.
        const notification = await sendNotificationUseCase({
            userId:  recipientId,
            type,
            title,
            message,
            metadata: {
                actorId:  actorId  ?? null,
                refId:    refId    ?? null,
                refModel: refModel ?? null,
            },
        });

        // 2. Bust Redis cache so the next REST poll picks up the new entry.
        await redisDel(
            CacheKeys.userNotifications(String(recipientId)),
            CacheKeys.unreadCount(String(recipientId)),
        );

        return notification;
    } catch (err) {
        // Notification failure must NEVER crash the calling use case.
        console.error('[notification.service] send() failed:', err.message);
        return null;
    }
};

// ── Bulk send ─────────────────────────────────────────────────────────────────

/**
 * Send the same notification to multiple recipients.
 * Used for bulk task assignment (teacher → all students).
 *
 * @param {string[]} recipientIds
 * @param {object}   options  — same shape as send(), without recipientId
 */
const sendToMany = async (recipientIds, options) => {
    if (!recipientIds?.length) return;
    await Promise.allSettled(
        recipientIds.map((recipientId) => send({ ...options, recipientId }))
    );
};

// ── Export ────────────────────────────────────────────────────────────────────

export const NotificationService = { send, sendToMany, TYPES: NotificationType };