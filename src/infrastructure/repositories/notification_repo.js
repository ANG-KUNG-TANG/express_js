
import { Notification as NotificationModel } from '../../domain/models/notification_model.js';
import { Notification }                      from '../../domain/entities/notificaiton_entity.js';

const toEntity = (doc) => doc
    ? new Notification({
        id:        doc._id.toString(),
        userId:    doc.userId.toString(),
        type:      doc.type,
        title:     doc.title,
        message:   doc.message,
        isRead:    doc.isRead,
        metadata:  doc.metadata,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    })
    : null;

export const notificationRepo = {

    // (they were buried in metadata before — unqueryable and un-indexable)
    async create(notificationEntity) {
        const doc = await NotificationModel.create({
            userId:   notificationEntity.userId,
            type:     notificationEntity.type,
            title:    notificationEntity.title,
            message:  notificationEntity.message,
            isRead:   notificationEntity.isRead,
            actorId:  notificationEntity.metadata?.actorId  ?? null,
            refId:    notificationEntity.metadata?.refId    ?? null,
            refModel: notificationEntity.metadata?.refModel ?? null,
            metadata: notificationEntity.metadata,
        });
        return toEntity(doc);
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
        return { notifications: docs.map(toEntity), total };
    },

    async countUnread(userId) {
        return NotificationModel.countDocuments({ userId, isRead: false });
    },

    async markRead(userId, ids) {
        const filter = ids === 'all'
            ? { userId }
            : { userId, _id: { $in: ids } };

        const result = await NotificationModel.updateMany(filter, { isRead: true });
        return result.modifiedCount;
    },

    async deleteOne(userId, notificationId) {
        const doc = await NotificationModel.findOneAndDelete({
            _id:    notificationId,
            userId,               // ownership guard — user can only delete their own
        });
        return doc ? true : null;
    },
};