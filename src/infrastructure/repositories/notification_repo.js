// infrastructure/repositories/notification_repo.js
// Mirrors user_repo.js / task_repo.js: thin DB adapter, maps rows → entities

import { Op }               from 'sequelize';
import { NotificationModel } from '../../domain/models/notification_model.js';
import { Notification }      from '../../domain/entities/notification_entity.js';

const toEntity = (row) => row
    ? new Notification({
        id:        row.id,
        userId:    row.userId,
        type:      row.type,
        title:     row.title,
        message:   row.message,
        isRead:    row.isRead,
        metadata:  row.metadata,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    })
    : null;

export const notificationRepo = {
    async create(notificationEntity) {
        const row = await NotificationModel.create({
            id:       notificationEntity.id,
            userId:   notificationEntity.userId,
            type:     notificationEntity.type,
            title:    notificationEntity.title,
            message:  notificationEntity.message,
            isRead:   notificationEntity.isRead,
            metadata: notificationEntity.metadata,
        });
        return toEntity(row);
    },

    async findByUserId(userId, { page = 1, limit = 20 } = {}) {
        const { count, rows } = await NotificationModel.findAndCountAll({
            where:  { userId },
            order:  [['createdAt', 'DESC']],
            limit,
            offset: (page - 1) * limit,
        });
        return { notifications: rows.map(toEntity), total: count };
    },

    async countUnread(userId) {
        return NotificationModel.count({ where: { userId, isRead: false } });
    },

    /**
     * @param {string}          userId
     * @param {string[]|'all'}  ids
     * @returns {number} updatedCount
     */
    async markRead(userId, ids) {
        const where = ids === 'all'
            ? { userId }
            : { userId, id: { [Op.in]: ids } };

        const [updatedCount] = await NotificationModel.update(
            { isRead: true },
            { where }
        );
        return updatedCount;
    },
};