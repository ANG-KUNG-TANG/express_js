// src/infrastructure/repositories/notification_repo.js
import { Notification as NotificationModel } from '../models/notification_model.js';
import { Notification } from '../../domain/entities/notificaiton_entity.js';

// ── Private Mapping Helpers ────────────────────────────────────────────────

const toDomain = (doc) => {
    if (!doc) return null;
    return Notification.reconstitute({
        id:        doc._id.toString(),
        userId:    doc.userId.toString(),
        type:      doc.type,
        title:     doc.title,
        message:   doc.message,
        isRead:    doc.isRead,
        metadata:  doc.metadata,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    });
};

const toDoc = (notification) => ({
    userId:   notification.userId,
    type:     notification.type,
    title:    notification.title,
    message:  notification.message,
    isRead:   notification.isRead,
    metadata: notification.metadata,
});

// ── Repository Implementation ──────────────────────────────────────────────

export const notificationRepo = {

    async create(notificationEntity) {
        const doc = await NotificationModel.create(toDoc(notificationEntity));
        return toDomain(doc);
    },

    async findByUserId(userId, { page = 1, limit = 20 } = {}) {
        const [total, docs] = await Promise.all([
            NotificationModel.countDocuments({ userId }),
            NotificationModel
                .find({ userId })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
        ]);
        return { notifications: docs.map(toDomain), total };
    },

    async countUnread(userId) {
        return NotificationModel.countDocuments({ userId, isRead: false });
    },

    /**
     * Mark notifications as read using the domain method.
     */
    async markRead(userId, ids) {
        const filter = ids === 'all' 
            ? { userId, isRead: false } 
            : { userId, _id: { $in: ids }, isRead: false };

        // We update the DB directly, but ensure business logic is consistent
        const result = await NotificationModel.updateMany(filter, { 
            $set: { isRead: true, updatedAt: new Date() } 
        });
        return result.modifiedCount;
    },

    async deleteOne(userId, notificationId) {
        const doc = await NotificationModel.findOneAndDelete({
            _id: notificationId,
            userId,
        });
        return !!doc;
    },
};