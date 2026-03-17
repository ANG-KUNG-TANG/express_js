// app/notification_uc/send_notification.uc.js
import { Notification } from '../../domain/entities/notificaiton_entity.js';
import { notificationRepo }  from '../../infrastructure/repositories/notification_repo.js';
import * as userRepo         from '../../infrastructure/repositories/user_repo.js';
import { emailService }      from '../../core/services/email.service.js';
import { getIO }             from '../../core/socket.js';   // Socket.IO singleton

/**
 * Core dispatcher used by ALL notification triggers.
 * 1. Validates + persists an in-app Notification entity
 * 2. Sends an email if the user has email notifications enabled
 */
export const sendNotificationUseCase = async ({
    userId,
    type,
    title,
    message,
    metadata     = null,
    emailSubject = null,
    ctaText      = null,
    ctaUrl       = null,
}) => {
    // Entity validates type, required fields, assigns UUID
    const notification = new Notification({ userId, type, title, message, metadata });
    await notificationRepo.create(notification);

    // ── Real-time push — student's bell updates instantly without refresh ─────
    try {
        const io = getIO();
        if (io) {
            io.to(String(userId)).emit('notification:new', {
                _id:       notification.id,
                type:      notification.type,
                title:     notification.title,
                message:   notification.message,
                metadata:  notification.metadata,
                isRead:    false,
                createdAt: notification.createdAt,
            });
        }
    } catch (err) {
        // Never let a socket error crash the HTTP response
        console.error('[sendNotificationUseCase] socket emit failed:', err.message);
    }

    const user = await userRepo.findById(userId);
    if (user && user.emailNotificationsEnabled !== false) {
        await emailService.sendNotificationEmail({
            toEmail:  user.email  ?? user._email,
            userName: user.name   ?? user._name,
            subject:  emailSubject ?? title,
            title,
            body:     message,
            ctaText:  ctaText ?? 'Go to IELTS Platform',
            ctaUrl:   ctaUrl  ?? process.env.FRONTEND_URL,
        }).catch((err) =>
            console.error('[sendNotificationUseCase] email failed:', err.message)
        );
    }

    return notification;
};