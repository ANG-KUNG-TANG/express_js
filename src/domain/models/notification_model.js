// models/notification.model.js
//
// Stores all in-app notifications.
// The navbar bell queries GET /api/notifications?page=1&limit=15
// which returns { notifications: [...], unreadCount: N }.

import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
    {
        // Recipient
        userId: {
            type:     mongoose.Schema.Types.ObjectId,
            ref:      'User',
            required: true,
            index:    true,
        },

        // Notification type — must match the TYPE_ICONS keys in navbar.js:
        // 'task_assigned' | 'task_accepted' | 'task_declined' | 'task_submitted'
        // 'task_reminder' | 'test_result'   | 'score_available' | 'account_alert'
        // 'exam_reminder' | 'practice_ready'| 'password_changed'
        type: {
            type:     String,
            required: true,
            trim:     true,
        },

        title: {
            type:     String,
            required: true,
            trim:     true,
            maxlength: 120,
        },

        message: {
            type:     String,
            required: true,
            trim:     true,
            maxlength: 400,
        },

        // Arbitrary extra payload (taskId, teacherId, etc.)
        // Named 'metadata' to match the Notification entity and notificationRepo
        metadata: {
            type:    mongoose.Schema.Types.Mixed,
            default: null,
        },

        isRead: {
            type:    Boolean,
            default: false,
            index:   true,
        },
    },
    {
        timestamps: true,   // createdAt + updatedAt
        versionKey: false,
    }
);

// Compound index: fetch a user's latest notifications fast
notificationSchema.index({ userId: 1, createdAt: -1 });

// Auto-delete notifications older than 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const Notification = mongoose.model('Notification', notificationSchema);