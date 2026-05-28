import UserModel from "../models/user_model.js";
import mongoose from 'mongoose';
import { User } from '../../domain/entities/user_entity.js';
import { UserRole } from "../../domain/base/user_enums.js";
import { toDomain, toPersistence } from './user_mapper.js'; // Clean external imports
import {
    UserValidationError,
    UserEmailNotFoundError,
    UserEmailAlreadyExistsError,
    InvalidCredentialsError,
    UserNotFoundError,
} from '../../core/errors/user.errors.js';
import logger from '../../core/logger/logger.js';
import { verifyPassword } from '../../app/validators/password_hash.js';

// ---------------------------------------------------------------------------
// Guard helper — DRY ObjectId validation used throughout
// ---------------------------------------------------------------------------
const assertValidId = (id, label = 'user id') => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new UserValidationError(`invalid ${label} format`);
    }
};

// ===========================================================================
// Queries
// ===========================================================================

export const findUserById = async (id) => {
    assertValidId(id);
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

/**
 * Like findUserByEmail but includes the hashed password field.
 * Only used by authenticateUser — never expose the result directly to HTTP layers.
 */
export const findUserByEmailWithPassword = async (email) => {
    logger.debug('userRepo.findUserByEmailWithPassword', { email });
    
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean();
    if (!doc) {
        logger.warn('userRepo.findUserByEmailWithPassword: not found', { email });
        throw new UserEmailNotFoundError(email);
    }
    
    return toDomain(doc);
};

export const listAllUsers = async () => {
    logger.debug('userRepo.listAllUsers');
    
    const docs = await UserModel.find().select('-password').lean();
    logger.debug('userRepo.listAllUsers: result', { count: docs.length });
    
    return docs.map(toDomain);
};
/** @deprecated use listAllUsers */
export const lisAllUsers = listAllUsers;

/**
 * Generic filtered list — used by admin and teacher views.
 */
export const findAll = async (filter = {}) => {
    const query = {};
    if (filter.assignedTeacher) {
        assertValidId(filter.assignedTeacher, 'assignedTeacher id');
        query.assignedTeacher = new mongoose.Types.ObjectId(filter.assignedTeacher);
    }
    if (filter.role) query.role = filter.role;

    logger.debug('userRepo.findAll', { filter });
    const docs = await UserModel.find(query).select('-password').lean();
    logger.debug('userRepo.findAll: result', { count: docs.length });
    
    return docs.map(toDomain);
};

/**
 * Returns a lightweight public list — optimized shape, bypassing entities.
 */
export const findStudentsByTeacher = async (teacherId) => {
    assertValidId(teacherId, 'teacherId');
    logger.debug('userRepo.findStudentsByTeacher', { teacherId });

    const docs = await UserModel.find({
        assignedTeacher: new mongoose.Types.ObjectId(teacherId),
        role:            { $nin: [UserRole.TEACHER, UserRole.ADMIN] },
    })
        .select('_id name email')
        .lean();

    logger.debug('userRepo.findStudentsByTeacher: result', { count: docs.length });
    return docs.map((d) => ({
        id:    d._id.toString(),
        name:  d.name  ?? '',
        email: d.email ?? '',
    }));
};

/**
 * Verifies teacher assignment before returning the student entity.
 */
export const findStudentByIdForTeacher = async (teacherId, studentId) => {
    assertValidId(teacherId, 'teacherId');
    assertValidId(studentId, 'studentId');
    logger.debug('userRepo.findStudentByIdForTeacher', { teacherId, studentId });

    const doc = await UserModel.findOne({
        _id:             new mongoose.Types.ObjectId(studentId),
        assignedTeacher: new mongoose.Types.ObjectId(teacherId),
        role:            { $nin: [UserRole.TEACHER, UserRole.ADMIN] },
    })
        .select('-password')
        .lean();

    if (!doc) throw new UserNotFoundError(studentId);
    return toDomain(doc);
};

// ===========================================================================
// Writes & Updates (The Domain Mutation Core)
// ===========================================================================

/**
 * Accepts a fully-constructed User entity, checks for duplicates, then persists.
 */
export const createUser = async (user) => {
    // Backward compatibility check to ensure we are holding an entity
    const entity = user instanceof User ? user : User.create(user);
    logger.debug('userRepo.createUser', { email: entity.email });

    const existing = await UserModel.findOne({ email: entity.email });
    if (existing) {
        logger.warn('userRepo.createUser: email already exists', { email: entity.email });
        throw new UserEmailAlreadyExistsError(entity.email);
    }

    // Pass structured plain data from the external mapper straight to Mongoose
    const [doc] = await UserModel.create([toPersistence(entity)]);
    logger.debug('userRepo.createUser: saved', { id: doc._id });
    
    return toDomain(doc);
};

/**
 * Unified Functional Mutation Engine.
 * Loads the entity, lets the caller run private instance methods on it, 
 * then serializes and saves back the clean results.
 */
export const updateUser = async (id, mutate) => {
    assertValidId(id);
    logger.debug('userRepo.updateUser', { id });

    // Load current entity state safely without password tracking overhead
    const user = await findUserById(id);

    // Run the domain operations (e.g. u.verify(), u.updateProfile())
    mutate(user);

    // Save the post-mutated entity across the mapper bridge
    const doc = await UserModel.findByIdAndUpdate(
        id,
        { $set: toPersistence(user) },
        { returnDocument: 'after', runValidators: true }
    ).lean();

    if (!doc) throw new UserNotFoundError(id);
    logger.debug('userRepo.updateUser: updated', { id });
    
    return toDomain(doc);
};

// ---------------------------------------------------------------------------
// Convenience Wrapper Callers (Orchestrated perfectly via updateUser)
// ---------------------------------------------------------------------------

export const updateProfileInfo = async (id, fields) => {
    return updateUser(id, (u) => u.updateProfile(fields));
};

export const updateAvatarUrl = async (id, avatarUrl) => {
    return updateUser(id, (u) => u.setAvatarUrl(avatarUrl));
};

export const updateCoverUrl = async (id, coverUrl) => {
    return updateUser(id, (u) => u.setCoverUrl(coverUrl));
};

export const promoteToAdmin = async (id) => {
    return updateUser(id, (u) => u.promoteToAdmin());
};

export const demoteToStudent = async (id) => {
    return updateUser(id, (u) => u.demoteToUser());
};

export const verifyUser = async (id) => {
    return updateUser(id, (u) => u.verify());
};

export const deactivateUser = async (id) => {
    return updateUser(id, (u) => u.deactivate());
};

export const reactivateUser = async (id) => {
    return updateUser(id, (u) => u.reactivate());
};

export const assignTeacher = async (studentId, teacherId) => {
    return updateUser(studentId, (u) => u.assignTeacher(teacherId));
};

export const changePassword = async (id, hashedPassword) => {
    return updateUser(id, (u) => u.changePassword(hashedPassword));
};

// ===========================================================================
// Atomic Sub-Document Array Management (Attachments)
// ===========================================================================

export const addAttachment = async (id, attachment) => {
    assertValidId(id);
    logger.debug('userRepo.addAttachment', { id, file: attachment.originalName });

    const doc = await UserModel.findByIdAndUpdate(
        id,
        { $push: { attachments: attachment } },
        { returnDocument: 'after', runValidators: true }
    ).lean();

    if (!doc) throw new UserNotFoundError(id);
    return toDomain(doc);
};

export const removeAttachment = async (userId, fileId) => {
    assertValidId(userId);
    logger.debug('userRepo.removeAttachment', { userId, fileId });

    const doc = await UserModel.findByIdAndUpdate(
        userId,
        { $pull: { attachments: { _id: new mongoose.Types.ObjectId(fileId) } } },
        { returnDocument: 'after' }
    ).lean();

    if (!doc) throw new UserNotFoundError(userId);
    return toDomain(doc);
};

export const getAttachments = async (userId) => {
    assertValidId(userId);
    logger.debug('userRepo.getAttachments', { userId });

    const doc = await UserModel.findById(userId).select('attachments').lean();
    if (!doc) throw new UserNotFoundError(userId);
    return doc.attachments ?? [];
};

// ===========================================================================
// Authentication Layer Coordination
// ===========================================================================

export const authenticateUser = async (email, password) => {
    logger.debug('userRepo.authenticateUser', { email });

    // Grab the database shape including the password hash explicitly
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean();
    if (!doc) {
        logger.warn('userRepo.authenticateUser: not found', { email });
        throw new UserEmailNotFoundError(email);
    }

    try {
        if (!verifyPassword(password, doc.password)) throw new InvalidCredentialsError();
    } catch (err) {
        if (err instanceof InvalidCredentialsError) throw err;
        logger.warn('userRepo.authenticateUser: verify error', { email, error: err.message });
        throw new InvalidCredentialsError();
    }

    logger.debug('userRepo.authenticateUser: valid', { email });
    
    // Returns a pure domain entity. Passwords never exit this function scope!
    return toDomain(doc);
};

// ===========================================================================
// Direct Targeted Optimization Operations
// ===========================================================================

export const setPasswordResetRequired = async (id) => {
    assertValidId(id);
    logger.debug('userRepo.setPasswordResetRequired', { id });
    
    const doc = await UserModel.findByIdAndUpdate(
        id,
        { $set: { mustResetPassword: true, updatedAt: new Date() } },
        { returnDocument: 'after' }
    ).lean();
    
    if (!doc) throw new UserNotFoundError(id);
    return toDomain(doc);
};

export const updateLastLogin = async (id) => {
    assertValidId(id);
    logger.debug('userRepo.updateLastLogin', { id });
    await UserModel.findByIdAndUpdate(
        id,
        { $set: { lastLoginAt: new Date() } }
    );
};

export const deleteUser = async (id) => {
    assertValidId(id);
    logger.debug('userRepo.deleteUser', { id });
    
    const doc = await UserModel.findByIdAndDelete(id).lean();
    if (!doc) throw new UserNotFoundError(id);
    
    return { deleted: true };
};

// ===========================================================================
// Bulk Database Operations (Performance Multi-writes)
// ===========================================================================

export const bulkDeleteUsers = async (ids = []) => {
    const invalid = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalid.length) throw new UserValidationError(`invalid id(s): ${invalid.join(', ')}`);

    logger.debug('userRepo.bulkDeleteUsers', { count: ids.length });
    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
    const { deletedCount } = await UserModel.deleteMany({ _id: { $in: objectIds } });
    
    return { deleted: deletedCount };
};

export const bulkDeactivateUsers = async (ids = []) => {
    const invalid = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalid.length) throw new UserValidationError('one or more invalid id formats');

    logger.debug('userRepo.bulkDeactivateUsers', { count: ids.length });
    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
    
    const { modifiedCount } = await UserModel.updateMany(
        { _id: { $in: objectIds } },
        { $set: { isActive: false, updatedAt: new Date() } }
    );
    
    return { deactivated: modifiedCount };
};

export const bulkAssignTeacher = async (studentIds = [], teacherId) => {
    assertValidId(teacherId, 'teacherId');
    const invalid = studentIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalid.length) throw new UserValidationError('one or more invalid student id formats');

    logger.debug('userRepo.bulkAssignTeacher', { studentCount: studentIds.length, teacherId });
    const objectIds    = studentIds.map((id) => new mongoose.Types.ObjectId(id));
    const teacherObjId = new mongoose.Types.ObjectId(teacherId);

    const { modifiedCount } = await UserModel.updateMany(
        { _id: { $in: objectIds }, role: { $nin: [UserRole.TEACHER, UserRole.ADMIN] } },
        { $set: { assignedTeacher: teacherObjId, updatedAt: new Date() } }
    );
    
    return { assigned: modifiedCount };
};

// ===========================================================================
// Complex Aggregations & Filtered Paginated Search
// ===========================================================================

export const searchUsers = async ({ q, role, isActive, from, to, page = 1, limit = 20 } = {}) => {
    logger.debug('userRepo.searchUsers', { q, role, isActive, from, to, page, limit });

    const query = {};

    if (q) {
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
            { name:  { $regex: escaped, $options: 'i' } },
            { email: { $regex: escaped, $options: 'i' } },
        ];
    }

    if (role     !== undefined) query.role     = role;
    if (isActive !== undefined) query.isActive = isActive;

    if (from || to) {
        query.createdAt = {};
        if (from) query.createdAt.$gte = new Date(from);
        if (to)   query.createdAt.$lte = new Date(to);
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await UserModel.countDocuments(query);
    const docs  = await UserModel
        .find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();

    return {
        data:  docs.map(toDomain),
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
    };
};

export const getTeacherWorkloads = async () => {
    logger.debug('userRepo.getTeacherWorkloads');
    const rows = await UserModel.aggregate([
        { $match: { role: UserRole.TEACHER } },
        {
            $lookup: {
                from:         'users',
                localField:   '_id',
                foreignField: 'assignedTeacher',
                as:           'students',
            },
        },
        {
            $project: {
                _id:          1,
                name:         1,
                email:        1,
                studentCount: { $size: '$students' },
            },
        },
        { $sort: { studentCount: -1 } },
    ]);
    
    return rows.map((r) => ({
        id:           r._id.toString(),
        name:         r.name,
        email:        r.email,
        studentCount: r.studentCount,
    }));
};

export const getTeacherDashboardStats = async (teacherId) => {
    assertValidId(teacherId, 'teacherId');
    logger.debug('userRepo.getTeacherDashboardStats', { teacherId });

    const teacherObjId  = new mongoose.Types.ObjectId(teacherId);
    const now           = new Date();
    const startOfMonth  = new Date(now.getFullYear(), now.getMonth(), 1);

    const studentCount = await UserModel.countDocuments({
        assignedTeacher: teacherObjId,
        role:            { $nin: [UserRole.TEACHER, UserRole.ADMIN] },
    });

    const [taskStats = {}] = await UserModel.aggregate([
        { $match: { _id: teacherObjId, role: UserRole.TEACHER } },
        {
            $lookup: {
                from:     'writingtasks',   
                let:      { tid: '$_id' },
                pipeline: [
                    { $match: { $expr: { $eq: ['$assignedBy', '$$tid'] } } },
                ],
                as: 'tasks',
            },
        },
        {
            $project: {
                _id: 0,
                pendingReview: {
                    $size: {
                        $filter: {
                            input: '$tasks',
                            cond:  { $in: ['$$this.status', ['SUBMITTED', 'submitted']] },
                        },
                    },
                },
                activeAssignments: {
                    $size: {
                        $filter: {
                            input: '$tasks',
                            cond:  { $in: ['$$this.status', ['ASSIGNED', 'WRITING', 'assigned', 'writing']] },
                        },
                    },
                },
                reviewedThisMonth: {
                    $size: {
                        $filter: {
                            input: '$tasks',
                            cond: {
                                $and: [
                                    { $in:  ['$$this.status', ['REVIEWED', 'SCORED', 'reviewed', 'scored']] },
                                    { $gte: ['$$this.updatedAt', startOfMonth] },
                                ],
                            },
                        },
                    },
                },
            },
        },
    ]);

    return {
        studentCount,
        pendingReview:     taskStats.pendingReview     ?? 0,
        activeAssignments: taskStats.activeAssignments ?? 0,
        reviewedThisMonth: taskStats.reviewedThisMonth ?? 0,
    };
};

export const getUserActivitySummary = async (id) => {
    assertValidId(id);
    logger.debug('userRepo.getUserActivitySummary', { id });
    const objectId = new mongoose.Types.ObjectId(id);

    const [row] = await UserModel.aggregate([
        { $match: { _id: objectId } },
        {
            $lookup: {
                from:         'tasks',
                localField:   '_id',
                foreignField: 'userId',
                as:           'tasks',
            },
        },
        {
            $project: {
                _id:         1,
                name:        1,
                email:       1,
                role:        1,
                isActive:    1,
                lastLoginAt: 1,
                createdAt:   1,
                taskTotal:     { $size: '$tasks' },
                taskSubmitted: {
                    $size: {
                        $filter: {
                            input: '$tasks',
                            cond:  { $in: ['$$this.status', ['submitted', 'reviewed', 'scored']] },
                        },
                    },
                },
                taskScored: {
                    $size: {
                        $filter: {
                            input: '$tasks',
                            cond:  { $eq: ['$$this.status', 'scored'] },
                        },
                    },
                },
            },
        },
    ]);

    if (!row) throw new UserNotFoundError(id);
    return {
        id:            row._id.toString(),
        name:          row.name,
        email:         row.email,
        role:          row.role,
        isActive:      row.isActive ?? true,
        lastLoginAt:   row.lastLoginAt ?? null,
        createdAt:     row.createdAt,
        taskTotal:     row.taskTotal,
        taskSubmitted: row.taskSubmitted,
        taskScored:    row.taskScored,
    };
};

// Aliases kept explicitly for backwards compatibility with legacy routes/use cases
export const findById    = findUserById;
export const findByEmail = findUserByEmail;
export const create      = createUser;