import mongoose from 'mongoose';
import { User } from '../../domain/entities/user_entity.js';

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

/**
 * Translates a raw Mongoose lean document into a secure Domain Entity.
 * Uses User.reconstitute so validations aren't accidentally re-run on old data.
 */
export const toDomain = (doc) => {
    if (!doc) return null;
    
    return User.reconstitute({
        id:              doc._id.toString(),
        name:            doc.name,
        email:           doc.email,
        password:        doc.password        ?? null,
        role:            doc.role,
        provider:        doc.provider        ?? 'local',
        providerId:      doc.providerId      ?? null,
        avatarUrl:       doc.avatarUrl       ?? null,
        coverUrl:        doc.coverUrl        ?? null,
        bio:             doc.bio             ?? '',
        targetBand:      doc.targetBand      ?? null,
        examDate:        doc.examDate        ?? null,
        attachments:     doc.attachments     ?? [],
        createdAt:       doc.createdAt,
        updatedAt:       doc.updatedAt,
        assignedTeacher: doc.assignedTeacher ? doc.assignedTeacher.toString() : null,
        isVerified:      doc.isVerified      ?? false,
        isActive:        doc.isActive        ?? true,
    });
};

/**
 * Translates a Domain Entity into a plain storage object for Mongoose writes.
 * Reads cleanly through public getters — no touching private # fields!
 */
export const toPersistence = (user) => {
    if (!user) return null;
    
    const persistence = {
        name:            user.name,            // ← Uses safe public getters
        email:           user.email.toLowerCase(),
        password:        user.password,        // Can be null for OAuth
        role:            user.role,
        provider:        user.provider,
        providerId:      user.providerId,
        avatarUrl:       user.avatarUrl,
        coverUrl:        user.coverUrl,
        bio:             user.bio,
        targetBand:      user.targetBand,
        examDate:        user.examDate,
        attachments:     user.attachments    ?? [],
        createdAt:       user.createdAt,
        updatedAt:       user.updatedAt,
        assignedTeacher: user.assignedTeacher ?? null,
        isVerified:      user.isVerified,
        isActive:        user.isActive,
    };

    // Safely map string ID back to MongoDB ObjectId format if it exists
    if (user.id && mongoose.Types.ObjectId.isValid(user.id)) {
        persistence._id = new mongoose.Types.ObjectId(user.id);
    }
    
    return persistence;
};

// ---------------------------------------------------------------------------
// DTO Presenters (Moved away from 'sanitizeUser' logic)
// ---------------------------------------------------------------------------

/**
 * Formats a Domain Entity into a clean Data Transfer Object (DTO) for controllers.
 * Completely excludes the password hash field so it can NEVER leak via HTTP.
 */
export const toResponseDTO = (user) => {
    if (!user) return null;
    
    return {
        id:              user.id,
        name:            user.name,
        email:           user.email,
        role:            user.role,
        provider:        user.provider,
        avatarUrl:       user.avatarUrl      ?? null,
        coverUrl:        user.coverUrl       ?? null,
        bio:             user.bio            ?? '',
        targetBand:      user.targetBand     ?? null,
        examDate:        user.examDate       ?? null,
        attachments:     user.attachments    ?? [],
        createdAt:       user.createdAt,
        updatedAt:       user.updatedAt,
        assignedTeacher: user.assignedTeacher,
        isVerified:      user.isVerified,
        isActive:        user.isActive,
        // 🔒 'password' is left out completely here.
    };
};