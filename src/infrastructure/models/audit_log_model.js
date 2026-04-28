// src/domain/models/audit_log_model.js
import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema(
    {
        method:    { type: String, default: null },
        path:      { type: String, default: null },
        ip:        { type: String, default: null },
        userAgent: { type: String, default: null },
        requestId: { type: String, default: null },
    },
    { _id: false }
);

const auditLogSchema = new mongoose.Schema(
    {
        action: {
            type:     String,
            required: true,
            index:    true,
        },
        outcome: {
            type:    String,
            enum:    ['success', 'failure'],
            default: 'success',
        },
        requesterId: {
            type:    mongoose.Schema.Types.ObjectId,
            ref:     'User',
            default: null,
            index:   true,
        },
        details: {
            type:    mongoose.Schema.Types.Mixed,
            default: {},
        },
        request: {
            type:    requestSchema,
            default: null,
        },
    },
    {
        // schema level via `{ timestamps: false }` and add createdAt manually as
        // a reliable cross-version alternative.
        timestamps: false,
        collection: 'audit_logs',
    }
);

// Add createdAt manually so it is immutable and always indexed correctly.
auditLogSchema.add({
    createdAt: {
        type:      Date,
        default:   Date.now,
        immutable: true,   // prevents accidental overwrites
        index:     true,
    },
});

// Compound indexes for the most common admin queries
auditLogSchema.index({ requesterId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1,     createdAt: -1 });

const AuditLogModel = mongoose.model('AuditLog', auditLogSchema);
export default AuditLogModel;