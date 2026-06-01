import UserModel from "../models/user_model.js";
import mongoose from 'mongoose';
import { User } from '../../domain/entities/user_entity.js';
import { UserRole } from "../../domain/base/user_enums.js";
import { toDomain, toPersistence } from '../mapper/user.mapper.js';
import {
    UserValidationError,
    UserEmailNotFoundError,
    UserEmailAlreadyExistsError,
    InvalidCredentialsError,
    UserNotFoundError,
} from '../../core/errors/user.errors.js';
import logger from '../../core/logger/logger.js';
import { verifyPassword } from '../../domain/validators/password_hash.js';

// ---------------------------------------------------------------------------
// Guard helper — DRY ObjectId validation used throughout
// ---------------------------------------------------------------------------
const assertValidId = (id, label = 'user id') => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new UserValidationError(`invalid ${label} format`);
    }
};

// ===========================================================================
// Queries (Kept completely silent unless a structural data boundary error happens)
// ===========================================================================

export const findUserById = async (id) => {
    assertValidId(id);
    const doc = await UserModel.findById(id).select('-password').lean();
    if (!doc) throw new UserNotFoundError(id);
    return toDomain(doc);
};

export const findUserByEmail = async (email) => {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).select('-password').lean();
    if (!doc) throw new UserEmailNotFoundError(email);
    return toDomain(doc);
};

export const findUserByEmailWithPassword = async (email) => {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean();
    if (!doc) {
        // KEEP: Security monitoring context for non-existent users attempting logins
        logger.warn('userRepo.findUserByEmailWithPassword: Not found', { email });
        throw new UserEmailNotFoundError(email);
    }
    return toDomain(doc);
};

export const listAllUsers = async () => {
    const docs = await UserModel.find().select('-password').lean();
    return docs.map(toDomain);
};
/** @deprecated use listAllUsers */
export const lisAllUsers = listAllUsers;

export const findAll = async (filter = {}) => {
    const query = {};
    if (filter.assignedTeacher) {
        assertValidId(filter.assignedTeacher, 'assignedTeacher id');
        query.assignedTeacher = new mongoose.Types.ObjectId(filter.assignedTeacher);
    }
    if (filter.role) query.role = filter.role;

    const docs = await UserModel.find(query).select('-password').lean();
    return docs.map(toDomain);
};

export const findStudentsByTeacher = async (teacherId) => {
    assertValidId(teacherId, 'teacherId');
    const docs = await UserModel.find({
        assignedTeacher: new mongoose.Types.ObjectId(teacherId),
        role:            { $nin: [UserRole.TEACHER, UserRole.ADMIN] },
    })
        .select('_id name email')
        .lean();

    return docs.map((d) => ({
        id:    d._id.toString(),
        name:  d.name  ?? '',
        email: d.email ?? '',
    }));
};

export const findStudentByIdForTeacher = async (teacherId, studentId) => {
    assertValidId(teacherId, 'teacherId');
    assertValidId(studentId, 'studentId');

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
// Writes & Updates (The Domain Mutation Core — Debug/Warn logs kept for logic tracking)
// ===========================================================================

export const createUser = async (user) => {
    const entity = user instanceof User ? user : User.create(user);

    const existing = await UserModel.findOne({ email: entity.email });
    if (existing) {
        // KEEP: Warn log protects against malicious/automated double sign-up collisions
        logger.warn('userRepo.createUser: Registration conflict', { email: entity.email });
        throw new UserEmailAlreadyExistsError(entity.email);
    }

    const [doc] = await UserModel.create([toPersistence(entity)]);
    return toDomain(doc);
};

export const updateUser = async (id, mutate) => {
    assertValidId(id);

    const user = await findUserById(id);

    // Run custom, domain-driven operations inside functional hook
    mutate(user);

    // KEEP: Useful debugging log to watch what properties are moving over to the DB
    logger.debug('[repo.updateUser] Persisting domain mutation changes', { 
        id, 
        role: user.role, 
        isVerified: user.isVerified 
    });

    const doc = await UserModel.findByIdAndUpdate(
        id,
        { $set: toPersistence(user) },
        { returnDocument: 'after', runValidators: true }
    ).lean();

    if (!doc) throw new UserNotFoundError(id);
    return toDomain(doc);
};

// ---------------------------------------------------------------------------
// Convenience Wrapper Callers
// ---------------------------------------------------------------------------
export const updateProfileInfo = async (id, fields) => updateUser(id, (u) => u.updateProfile(fields));
export const updateAvatarUrl   = async (id, avatarUrl) => updateUser(id, (u) => u.setAvatarUrl(avatarUrl));
export const updateCoverUrl    = async (id, coverUrl) => updateUser(id, (u) => u.setCoverUrl(coverUrl));
export const promoteToAdmin    = async (id) => updateUser(id, (u) => u.promoteToAdmin());
export const demoteToStudent   = async (id) => updateUser(id, (u) => u.demoteToUser());
export const verifyUser        = async (id) => updateUser(id, (u) => u.verify());
export const deactivateUser    = async (id) => updateUser(id, (u) => u.deactivate());
export const reactivateUser    = async (id) => updateUser(id, (u) => u.reactivate());
export const assignTeacher     = async (studentId, teacherId) => updateUser(studentId, (u) => u.assignTeacher(teacherId));
export const changePassword    = async (id, hashedPassword) => updateUser(id, (u) => u.changePassword(hashedPassword));

// ===========================================================================
// Atomic Sub-Document Array Management (Attachments)
// ===========================================================================

export const addAttachment = async (id, attachment) => {
    assertValidId(id);
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
    const doc = await UserModel.findById(userId).select('attachments').lean();
    if (!doc) throw new UserNotFoundError(userId);
    return doc.attachments ?? [];
};

// ===========================================================================
// Authentication Layer Coordination (Crucial Security Checkpoints)
// ===========================================================================

export const authenticateUser = async (email, password) => {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean();
    if (!doc) {
        logger.warn('userRepo.authenticateUser: Account not found', { email });
        throw new UserEmailNotFoundError(email);
    }

    try {
        if (!verifyPassword(password, doc.password)) throw new InvalidCredentialsError();
    } catch (err) {
        if (err instanceof InvalidCredentialsError) throw err;
        // KEEP: Security log to track algorithmic failures or key injection attempts
        logger.warn('userRepo.authenticateUser: Crypto validation failure', { email, error: err.message });
        throw new InvalidCredentialsError();
    }

    return toDomain(doc);
};

// ===========================================================================
// Direct Targeted Optimization Operations
// ===========================================================================

export const setPasswordResetRequired = async (id) => {
    assertValidId(id);
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
    await UserModel.findByIdAndUpdate(id, { $set: { lastLoginAt: new Date() } });
};

export const deleteUser = async (id) => {
    assertValidId(id);
    const doc = await UserModel.findByIdAndDelete(id).lean();
    if (!doc) throw new UserNotFoundError(id);
    return { deleted: true };
};

// ===========================================================================
// Bulk Database Operations (KEEP: Performance multi-writes logs)
// ===========================================================================

export const bulkDeleteUsers = async (ids = []) => {
    const invalid = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalid.length) throw new UserValidationError(`invalid id(s): ${invalid.join(', ')}`);

    // KEEP: Tracking bulk mutations ensures data losses can be audited via system logs
    logger.debug('[repo.bulkDeleteUsers] Executing bulk deletion', { count: ids.length });
    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
    const { deletedCount } = await UserModel.deleteMany({ _id: { $in: objectIds } });
    
    return { deleted: deletedCount };
};

export const bulkDeactivateUsers = async (ids = []) => {
    const invalid = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalid.length) throw new UserValidationError('one or more invalid id formats');

    logger.debug('[repo.bulkDeactivateUsers] Executing bulk deactivation', { count: ids.length });
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

    logger.debug('[repo.bulkAssignTeacher] Reassigning student workload tier', { studentCount: studentIds.length, teacherId });
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
    const objectId = new mongoose.Types.ObjectId(id);

    const [row] = await UserModel.aggregate([
        { $match: { _id: objectId } },
        {
            $lookup: {
                from:         'writingtasks',
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
export const findById    = findUserById;
export const findByEmail = findUserByEmail;
export const create      = createUser;