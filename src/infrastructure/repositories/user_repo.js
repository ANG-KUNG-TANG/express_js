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
        id: doc._id.toString(),
        name: doc.name,
        email: doc.email,
        password: doc.password,
        role: doc.role,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    });
};

const toDomainList = (docs) => docs.map(toDomain).filter(u => u !== null);

const toPersistence = (user) => {
    if (!user) return null;
    const persistence = {
        name: user._name,
        email: user._email.toLowerCase(),
        password: user._password,
        role: user._role,
        createdAt: user._createdAt,
        updatedAt: user._updatedAt,
    };
    if (user._id && mongoose.Types.ObjectId.isValid(user._id)) {
        persistence._id = new mongoose.Types.ObjectId(user._id);
    }
    return persistence;
};

export const sanitizeUser = (user) => {
    if (!user) return null;
    return {
        id: user.id,
        name: user._name,
        email: user.email,
        role: user._role,
        createdAt: user._createdAt,
        updatedAt: user._updatedAt,
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
    if (!doc) throw new UserNotFoundError('User with id UserNotFoundError');
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
    if (!doc) throw new UserEmailNotFoundError(email);
    return toDomain(doc);
};

export const lisAllUsers = async () => {
    logger.debug('userRepo.lisAllUsers');
    const docs = await UserModel.find().select('-password').lean();
    logger.debug('userRepo.lisAllUsers: result', { count: docs.length });
    return docs.map(toDomain);
};

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
    if (updates.name     !== undefined) user._name     = updates.name;
    if (updates.email    !== undefined) user._email    = updates.email.toLowerCase();
    if (updates.password !== undefined) user._password = updates.password;
    if (updates.role     !== undefined) user._role     = updates.role;
    user._updatedAt = new Date();

    const persistence = toPersistence(user);
    const doc = await UserModel.findByIdAndUpdate(
        id,
        persistence,
        { returenDocument: 'after', runValidators: true }
    ).lean();

    if (!doc) throw new UserNotFoundError(id);

    logger.debug('userRepo.updateUser: updated', { id });
    return toDomain(doc);
};

export const authenticateUser = async (email, password) => {
    logger.debug('userRepo.authenticateUser', { email });

    const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean();
    if (!doc) {
        logger.warn('userRepo.authenticateUser: email not found', { email });
        throw new UserEmailNotFoundError(email);
    }
    if (doc.password !== password) {
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