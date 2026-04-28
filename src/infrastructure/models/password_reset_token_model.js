// domain/models/password_reset_token_model.js

import mongoose from 'mongoose';

const passwordResetTokenSchema = new mongoose.Schema(
    {
        _id: {
            type:    String,  // UUID string from entity
            default: undefined,
        },
        userId: {
            type:     String,
            required: true,
            index:    true,
        },
        tokenHash: {
            type:     String,
            required: true,
            unique:   true,   // SHA-256 hash of the raw token
        },
        expiresAt: {
            type:     Date,
            required: true,
        },
        used: {
            type:    Boolean,
            default: false,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false }, // tokens are create + mark-used only
        versionKey: false,
    }
);

export const PasswordResetTokenModel = mongoose.model('PasswordResetToken', passwordResetTokenSchema);