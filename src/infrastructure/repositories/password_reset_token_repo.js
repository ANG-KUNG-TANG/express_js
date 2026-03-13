// infrastructure/repositories/password_reset_token_repo.js

import { PasswordResetTokenModel } from '../../domain/models/password_reset_token_model.js';
import { PasswordResetToken }      from '../../domain/entities/password_reset_token_entity.js';

const toEntity = (doc) => doc
    ? new PasswordResetToken({
        id:        doc._id,
        userId:    doc.userId,
        tokenHash: doc.tokenHash,
        expiresAt: doc.expiresAt,
        used:      doc.used,
        createdAt: doc.createdAt,
    })
    : null;

export const passwordResetTokenRepo = {

    async create(tokenEntity) {
        const doc = await PasswordResetTokenModel.create({
            _id:       tokenEntity.id,
            userId:    tokenEntity.userId,
            tokenHash: tokenEntity.tokenHash,
            expiresAt: tokenEntity.expiresAt,
            used:      tokenEntity.used,
        });
        return toEntity(doc);
    },

    async findByHash(tokenHash) {
        // FIX: Mongoose uses .findOne(filter) directly — no { where: } wrapper
        const doc = await PasswordResetTokenModel.findOne({ tokenHash }).lean();
        return toEntity(doc);
    },

    async save(tokenEntity) {
        // FIX: Mongoose uses .updateOne(filter, update) — no { where: } wrapper
        await PasswordResetTokenModel.updateOne(
            { _id: tokenEntity.id },
            { used: tokenEntity.used }
        );
    },

    async invalidateAllForUser(userId) {
        // FIX: Mongoose uses .updateMany(filter, update) — no { where: } wrapper
        await PasswordResetTokenModel.updateMany(
            { userId, used: false },
            { used: true }
        );
    },
};