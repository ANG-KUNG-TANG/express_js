// domain/models/notification_model.js

import mongoose from 'mongoose';
import { NotificationType } from '../entities/notificaiton_entity.js';

const notificationSchema = new mongoose.Schema(
    {
        _id: {
            type:    String,   // UUID string from entity
            default: undefined,
        },
        userId: {
            type:     String,
            required: true,
            index:    true,
        },
        type: {
            type:     String,
            enum:     Object.values(NotificationType),
            required: true,
        },
        title: {
            type:     String,
            required: true,
        },
        message: {
            type:     String,
            required: true,
        },
        isRead: {
            type:    Boolean,
            default: false,
        },
        metadata: {
            type:    mongoose.Schema.Types.Mixed,
            default: null,
        },
    },
    {
        timestamps:  true,              // adds createdAt + updatedAt
        versionKey:  false,
    }
);

// Compound indexes to mirror the original
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

export const NotificationModel = mongoose.model('Notification', notificationSchema);