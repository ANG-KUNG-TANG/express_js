import mongoose    from 'mongoose';
import { User } from '../../domain/entities/user_entity.js';

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

export const toDomain = (doc) => {
    if (!doc) return null;
    return new User({
        id:          doc._id.toString(),
        name:        doc.name,
        email:       doc.email,
        password:    doc.password,
        role:        doc.role,
        provider:    doc.provider   ?? 'local',
        providerId:  doc.providerId ?? null,
        avatarUrl:   doc.avatarUrl   ?? null,
        coverUrl:    doc.coverUrl    ?? null,
        bio:         doc.bio         ?? '',
        targetBand:  doc.targetBand  ?? null,
        examDate:    doc.examDate    ?? null,
        attachments: doc.attachments ?? [],
        createdAt:       doc.createdAt,
        updatedAt:       doc.updatedAt,
        assignedTeacher: doc.assignedTeacher ? doc.assignedTeacher.toString() : null,
        isVerified:  doc.isVerified ?? false,   // ← NEW
        isActive:    doc.isActive   ?? true,    // ← NEW
    });
};

export const toPersistence = (user) => {
    if (!user) return null;
    const persistence = {
        name:        user._name,
        email:       user._email.toLowerCase(),
        password:    user._password,
        role:        user._role,
        provider:    user._provider   ?? 'local',
        providerId:  user._providerId ?? null,
        avatarUrl:   user._avatarUrl,
        coverUrl:    user._coverUrl,
        bio:         user._bio,
        targetBand:  user._targetBand,
        examDate:    user._examDate,
        attachments: user._attachments ?? [],
        createdAt:       user._createdAt,
        updatedAt:       user._updatedAt,
        assignedTeacher: user._assignedTeacher ?? null,
        isVerified:  user._isVerified ?? false,   // ← NEW
        isActive:    user._isActive   ?? true,    // ← NEW
    };
    if (user._id && mongoose.Types.ObjectId.isValid(user._id)) {
        persistence._id = new mongoose.Types.ObjectId(user._id);
    }
    return persistence;
};

export const sanitizeUser = (user) => {
    if (!user) return null;
    return {
        id:          user.id,
        name:        user._name,
        email:       user.email,
        role:        user._role,
        provider:    user._provider   ?? 'local',
        avatarUrl:   user._avatarUrl  ?? null,
        coverUrl:    user._coverUrl   ?? null,
        bio:         user._bio        ?? '',
        targetBand:  user._targetBand ?? null,
        examDate:    user._examDate   ?? null,
        attachments: user._attachments ?? [],
        createdAt:       user._createdAt,
        updatedAt:       user._updatedAt,
        assignedTeacher: user._assignedTeacher ?? null,
        isVerified:  user._isVerified ?? false,   // ← NEW
        isActive:    user._isActive   ?? true,    // ← NEW
    };
};