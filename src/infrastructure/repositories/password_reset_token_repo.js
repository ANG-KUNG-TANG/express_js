// infrastructure/repositories/password_reset_token_repo.js
// Mirrors user_repo.js / task_repo.js: thin DB adapter, maps rows → entities

import { PasswordResetTokenModel } from '../../domain/models/password_reset_token_model.js';
import { PasswordResetToken }      from '../../domain/entities/password_reset_token_entity.js';

const toEntity = (row) => row
    ? new PasswordResetToken({
        id:        row.id,
        userId:    row.userId,
        tokenHash: row.tokenHash,
        expiresAt: row.expiresAt,
        used:      row.used,
        createdAt: row.createdAt,
    })
    : null;

export const passwordResetTokenRepo = {
    async create(tokenEntity) {
        const row = await PasswordResetTokenModel.create({
            id:        tokenEntity.id,
            userId:    tokenEntity.userId,
            tokenHash: tokenEntity.tokenHash,
            expiresAt: tokenEntity.expiresAt,
            used:      tokenEntity.used,
        });
        return toEntity(row);
    },

    async findByHash(tokenHash) {
        const row = await PasswordResetTokenModel.findOne({ where: { tokenHash } });
        return toEntity(row);
    },

    async save(tokenEntity) {
        await PasswordResetTokenModel.update(
            { used: tokenEntity.used },
            { where: { id: tokenEntity.id } }
        );
    },

    async invalidateAllForUser(userId) {
        await PasswordResetTokenModel.update(
            { used: true },
            { where: { userId, used: false } }
        );
    },
};