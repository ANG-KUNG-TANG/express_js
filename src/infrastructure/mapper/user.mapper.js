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
        provider:    doc.provider   ?? 'local',  // FIX: was missing — OAuth users always mapped back as 'local'
        providerId:  doc.providerId ?? null,      // FIX: was missing — lost after every read
        avatarUrl:   doc.avatarUrl   ?? null,
        coverUrl:    doc.coverUrl    ?? null,
        bio:         doc.bio         ?? '',
        targetBand:  doc.targetBand  ?? null,
        examDate:    doc.examDate    ?? null,
        attachments: doc.attachments ?? [],
        createdAt:       doc.createdAt,
        updatedAt:       doc.updatedAt,
        assignedTeacher: doc.assignedTeacher ? doc.assignedTeacher.toString() : null,
    });
};

export const toPersistence = (user) => {
    if (!user) return null;
    const persistence = {
        name:        user._name,
        email:       user._email.toLowerCase(),
        password:    user._password,
        role:        user._role,
        provider:    user._provider   ?? 'local',  // FIX: was missing — never persisted to MongoDB
        providerId:  user._providerId ?? null,      // FIX: was missing — never persisted to MongoDB
        avatarUrl:   user._avatarUrl,
        coverUrl:    user._coverUrl,
        bio:         user._bio,
        targetBand:  user._targetBand,
        examDate:    user._examDate,
        attachments: user._attachments ?? [],
        createdAt:       user._createdAt,
        updatedAt:       user._updatedAt,
        assignedTeacher: user._assignedTeacher ?? null,
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
    };
};
