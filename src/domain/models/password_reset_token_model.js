// domain/models/password_reset_token_model.js
// Mirrors user_model.js / task_model.js: DataTypes, tableName, indexes

import { DataTypes } from 'sequelize';
import { sequelize } from '../../infrastructure/repositories/db.js';

export const PasswordResetTokenModel = sequelize.define(
    'PasswordResetToken',
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
        tokenHash: {
            type:      DataTypes.STRING(64),
            allowNull: false,
            unique:    true,
            comment:   'SHA-256 hash of the raw token — raw token only lives in the email link',
        },
        expiresAt: {
            type:      DataTypes.DATE,
            allowNull: false,
        },
        used: {
            type:         DataTypes.BOOLEAN,
            defaultValue: false,
        },
    },
    {
        tableName:  'password_reset_tokens',
        timestamps: true,
        updatedAt:  false, // tokens are create + mark-used only
        indexes: [
            { fields: ['tokenHash'] },
            { fields: ['userId']    },
        ],
    }
);