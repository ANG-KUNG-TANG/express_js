// app/notification/send_noti.uc.js

import { getIO }             from '../../core/services/socket.service.js';
import { notificationRepo }  from '../../infrastructure/repositories/notification_repo.js';
import { Notification }      from '../../domain/entities/notificaiton_entity.js';

export const sendNotificationUseCase = async ({
    userId,
    type,
    title,
    message,
    ctaText,
    ctaUrl,
    metadata = {},
}) => {
    // 1. Build entity for validation only (type, userId, title, message guards).
    //    Do NOT pass an id — notification_model uses Mongoose auto ObjectId for _id,
    //    so we let the repo's NotificationModel.create() generate it.
    const entity = new Notification({
        userId,
        type,
        title,
        message,
        isRead:    false,
        metadata:  { ...metadata, ctaText: ctaText ?? null, ctaUrl: ctaUrl ?? null },
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    // 2. Persist — repo.create() receives the entity; _id is omitted so Mongoose
    //    generates a valid ObjectId automatically.
    const saved = await notificationRepo.create(entity);

    // 3. Push real-time event via Socket.IO.
    //    getIO() returns the io instance initialised at server boot.
    //    Guard against null so a missing socket server never crashes a UC.
    const io = getIO();
    if (io) {
        io.to(String(userId)).emit('notification:new', {
            _id:       saved._id ?? saved.id,
            type:      saved.type,
            title:     saved.title,      // FIX: was saved.type (showed type string instead of title)
            message:   saved.message,
            metadata:  saved.metadata,
            createdAt: saved.createdAt,
            isRead:    false,
        });
    }

    // 4. Email hook (wire up when ready)
    // if (emailSubject) await emailService.send({ to: ..., subject: emailSubject, ... });

    return saved;
};