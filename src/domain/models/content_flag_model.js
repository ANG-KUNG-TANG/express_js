// src/domain/models/content_flag_model.js
import mongoose from 'mongoose';

const contentFlagSchema = new mongoose.Schema(
    {
        taskId: {
            type:     mongoose.Schema.Types.ObjectId,
            ref:      'WritingTask',
            required: true,
            index:    true,
        },
        taskTitle: {
            type:    String,
            default: null,
        },
        flaggedBy: {
            type:     mongoose.Schema.Types.ObjectId,
            ref:      'User',
            required: true,
        },
        reason: {
            type:     String,
            required: true,
            trim:     true,
        },
        severity: {
            type:    String,
            enum:    ['low', 'medium', 'high'],
            default: 'medium',
        },
        status: {
            type:    String,
            enum:    ['open', 'resolved'],
            default: 'open',
            index:   true,
        },
        resolvedBy: {
            type:    mongoose.Schema.Types.ObjectId,
            ref:     'User',
            default: null,
        },
        resolvedAt: {
            type:    Date,
            default: null,
        },
    },
    {
        timestamps: true,           // createdAt + updatedAt auto-managed
        collection: 'content_flags',
    }
);

const ContentFlagModel = mongoose.model('ContentFlag', contentFlagSchema);
export default ContentFlagModel;