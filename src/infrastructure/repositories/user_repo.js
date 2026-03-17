import UserModel from "../../domain/models/user_model.js";
import { User } from "../../domain/entities/user_entity.js";
import { UserRole } from "../../domain/base/user_enums.js";
import mongoose from 'mongoose';
import {
    UserValidationError,
    UserEmailNotFoundError,
    UserEmailAlreadyExistsError,
    InvalidCredentialsError,
    UserNotFoundError,
} from '../../core/errors/user.errors.js';
import logger from '../../core/logger/logger.js';

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

const toDomain = (doc) => {
    if (!doc) return null;
    return new User({
        id:          doc._id.toString(),
        name:        doc.name,
        email:       doc.email,
        password:    doc.password,
        role:        doc.role,
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

const toPersistence = (user) => {
    if (!user) return null;
    const persistence = {
        name:        user._name,
        email:       user._email.toLowerCase(),
        password:    user._password,
        role:        user._role,
        avatarUrl:   user._avatarUrl,
        coverUrl:    user._coverUrl,
        bio:         user._bio,
        targetBand:  user._targetBand,
        examDate:    user._examDate,
        attachments: user._attachments,
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

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const findUserById = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new UserValidationError('invalid user id format');
    }
    logger.debug('userRepo.findUserById', { id });
    const doc = await UserModel.findById(id).select('-password').lean();
    if (!doc) throw new UserNotFoundError(id);
    return toDomain(doc);
};

export const findUserByEmail = async (email) => {
    logger.debug('userRepo.findUserByEmail', { email });
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).select('-password').lean();
    if (!doc) throw new UserEmailNotFoundError(email);
    return toDomain(doc);
};

export const findUserByEmailWithPassword = async (email) => {
    logger.debug('userRepo.findUserByEmailWithPassword', { email });
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean();
    if (!doc) {
        logger.warn("userRepo.findUserByEmailWithPassword: email not found", { email });
        throw new UserEmailNotFoundError(email);}
    return toDomain(doc);
};

export const lisAllUsers = async () => {
    logger.debug('userRepo.lisAllUsers');
    const docs = await UserModel.find().select('-password').lean();
    logger.debug('userRepo.lisAllUsers: result', { count: docs.length });
    return docs.map(toDomain);
};

/**
 * findAll({ assignedTeacher?, role? })
 * Used by teacher_list_students.uc.js to get all students linked to a teacher.
 */
export const findAll = async (filter = {}) => {
    const query = {};
    if (filter.assignedTeacher) {
        if (!mongoose.Types.ObjectId.isValid(filter.assignedTeacher)) {
            throw new UserValidationError('invalid assignedTeacher id format');
        }
        query.assignedTeacher = new mongoose.Types.ObjectId(filter.assignedTeacher);
    }
    if (filter.role) query.role = filter.role;

    logger.debug('userRepo.findAll', { filter });
    const docs = await UserModel.find(query).select('-password').lean();
    logger.debug('userRepo.findAll: result', { count: docs.length });
    return docs.map(toDomain);
};

// Alias used by send_noti_uc.js (imported as * as userRepo → userRepo.findById)
export const findById = findUserById;

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export const createUser = async (userData) => {
    logger.debug('userRepo.createUser', { email: userData.email });

    const existing = await UserModel.findOne({ email: userData.email.toLowerCase() });
    if (existing) {
        logger.warn('userRepo.createUser: email already exists', { email: userData.email });
        throw new UserEmailAlreadyExistsError("UserEmailAlreadyExistsError");
    }

    const user = new User(userData);
    const persistence = toPersistence(user);
    const [doc] = await UserModel.create([persistence]);

    logger.debug('userRepo.createUser: user saved', { id: doc._id });
    return toDomain(doc);
};

export const updateUser = async (id, updates) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new UserValidationError('invalid user id format');
    }

    logger.debug('userRepo.updateUser', { id, fields: Object.keys(updates) });

    const user = await findUserById(id);
    if (updates.name       !== undefined) user._name       = updates.name;
    if (updates.email      !== undefined) user._email      = updates.email.toLowerCase();
    if (updates.password   !== undefined) user._password   = updates.password;
    if (updates.role       !== undefined) user._role       = updates.role;
    if (updates.avatarUrl  !== undefined) user._avatarUrl  = updates.avatarUrl;
    if (updates.coverUrl   !== undefined) user._coverUrl   = updates.coverUrl;
    if (updates.bio        !== undefined) user._bio        = updates.bio;
    if (updates.targetBand !== undefined) user._targetBand = updates.targetBand;
    if (updates.examDate        !== undefined) user._examDate        = updates.examDate;
    if (updates.assignedTeacher !== undefined) user._assignedTeacher = updates.assignedTeacher;
    user._updatedAt = new Date();

    const persistence = toPersistence(user);
    const doc = await UserModel.findByIdAndUpdate(
        id,
        persistence,
        { returnDocument: 'after', runValidators: true }
    ).lean();

    if (!doc) throw new UserNotFoundError(id);

    logger.debug('userRepo.updateUser: updated', { id });
    return toDomain(doc);
};

// ---------------------------------------------------------------------------
// Profile-specific repo methods
// ---------------------------------------------------------------------------

export const updateProfileInfo = async (id, { name, email, bio, targetBand, examDate }) => {
    logger.debug('userRepo.updateProfileInfo', { id });
    return await updateUser(id, { name, email, bio, targetBand, examDate });
};

export const updateAvatarUrl = async (id, avatarUrl) => {
    logger.debug('userRepo.updateAvatarUrl', { id });
    return await updateUser(id, { avatarUrl });
};

export const updateCoverUrl = async (id, coverUrl) => {
    logger.debug('userRepo.updateCoverUrl', { id });
    return await updateUser(id, { coverUrl });
};

export const addAttachment = async (id, attachment) => {
    logger.debug('userRepo.addAttachment', { id, file: attachment.originalName });
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new UserValidationError('invalid user id format');
    }
    const doc = await UserModel.findByIdAndUpdate(
        id,
        { $push: { attachments: attachment } },
        { returnDocument: 'after', runValidators: true }
    ).lean();
    if (!doc) throw new UserNotFoundError(id);
    return toDomain(doc);
};

export const removeAttachment = async (userId, fileId) => {
    logger.debug('userRepo.removeAttachment', { userId, fileId });
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new UserValidationError('invalid user id format');
    }
    const doc = await UserModel.findByIdAndUpdate(
        userId,
        { $pull: { attachments: { _id: new mongoose.Types.ObjectId(fileId) } } },
        { returnDocument: 'after' }
    ).lean();
    if (!doc) throw new UserNotFoundError(userId);
    return toDomain(doc);
};

export const getAttachments = async (userId) => {
    logger.debug('userRepo.getAttachments', { userId });
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new UserValidationError('invalid user id format');
    }
    const doc = await UserModel.findById(userId).select('attachments').lean();
    if (!doc) throw new UserNotFoundError(userId);
    return doc.attachments ?? [];
};

// ---------------------------------------------------------------------------
// Auth / Admin
// ---------------------------------------------------------------------------

export const authenticateUser = async (email, password) => {
    logger.debug('userRepo.authenticateUser', { email });
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean();
    if (!doc) {
        logger.warn('userRepo.authenticateUser: email not found', { email });
        throw new UserEmailNotFoundError(email);
    }
    if (!verifyPassword(password, doc.password)) {
        logger.warn('userRepo.authenticateUser: invalid credentials', { email });
        throw new InvalidCredentialsError();
    }
    logger.debug('userRepo.authenticateUser: credentials valid', { email });
    return sanitizeUser(toDomain(doc));
};

export const promoteToAdmin = async (id) => {
    logger.debug('userRepo.promoteToAdmin', { id });
    const user = await findUserById(id);
    user.promoteToAdmin();
    logger.debug('userRepo.promoteToAdmin: promoting', { id, role: user._role });
    return await updateUser(id, { role: user._role });
};

export const deleteUser = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new UserValidationError('invalid user id format');
    }
    logger.debug('userRepo.deleteUser', { id });
    const doc = await UserModel.findByIdAndDelete(id).lean();
    if (!doc) throw new UserNotFoundError(id);
    logger.debug('userRepo.deleteUser: deleted', { id });
    return { deleted: true };
};