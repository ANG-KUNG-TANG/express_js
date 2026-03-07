// domain/models/notification_model.js

import { DataTypes } from 'sequelize';
import { sequelize } from '../../infrastructure/repositories/db.js';
import { NotificationType } from '../entities/notification_entity.js';

export const NotificationModel = sequelize.define(
    'Notification',
    {
        id: {
            type:         DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey:   true,
        },
        userId: {
            type:       DataTypes.UUID,
            allowNull:  false,
            references: { model: 'users', key: 'id' },
            onDelete:   'CASCADE',
        },
        type: {
            type:      DataTypes.ENUM(...Object.values(NotificationType)),
            allowNull: false,
        },
        title: {
            type:      DataTypes.STRING(255),
            allowNull: false,
        },
        message: {
            type:      DataTypes.TEXT,
            allowNull: false,
        },
        isRead: {
            type:         DataTypes.BOOLEAN,
            defaultValue: false,
        },
        metadata: {
            type:      DataTypes.JSONB,   // use DataTypes.TEXT + JSON.parse if not on Postgres
            allowNull: true,
        },
    },
    {
        tableName:  'notifications',
        timestamps: true,
        indexes: [
            { fields: ['userId']           },
            { fields: ['userId', 'isRead'] },
            { fields: ['createdAt']        },
        ],
    }
);