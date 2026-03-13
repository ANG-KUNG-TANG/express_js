// infrastructure/repositories/notification_repo.js

import { NotificationModel } from '../../domain/models/notification_model.js';
import { Notification }      from '../../domain/entities/notificaiton_entity.js';

const toEntity = (doc) => doc
    ? new Notification({
        id:        doc._id,
        userId:    doc.userId,
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

    async create(notificationEntity) {
        // FIX: use Mongoose .create() — entity id stored in _id
        const doc = await NotificationModel.create({
            _id:      notificationEntity.id,
            userId:   notificationEntity.userId,
            type:     notificationEntity.type,
            title:    notificationEntity.title,
            message:  notificationEntity.message,
            isRead:   notificationEntity.isRead,
            metadata: notificationEntity.metadata,
        });
        return toEntity(doc);
    },

    async findByUserId(userId, { page = 1, limit = 20 } = {}) {
        // FIX: Mongoose uses .countDocuments() + .find() instead of findAndCountAll
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
        // FIX: Mongoose uses .countDocuments() not .count()
        return NotificationModel.countDocuments({ userId, isRead: false });
    },

    /**
     * @param {string}          userId
     * @param {string[]|'all'}  ids
     * @returns {number} updatedCount
     */
    async markRead(userId, ids) {
        // FIX: Mongoose uses .updateMany() — no Op import needed
        const filter = ids === 'all'
            ? { userId }
            : { userId, _id: { $in: ids } };

        const result = await NotificationModel.updateMany(filter, { isRead: true });
        return result.modifiedCount;
    },
};