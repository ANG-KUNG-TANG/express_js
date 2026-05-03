import UserModel from "../models/user_model.js";
import mongoose    from 'mongoose';
import { User} from '../../domain/entities/user_entity.js';
import {UserRole} from "../../domain/base/user_enums.js";
import {
    UserValidationError,
    UserEmailNotFoundError,
    UserEmailAlreadyExistsError,
    InvalidCredentialsError,
    UserNotFoundError,
} from '../../core/errors/user.errors.js';
import logger from '../../core/logger/logger.js';
import { verifyPassword } from '../../app/validators/password_hash.js';
import { toDomain, toPersistence, sanitizeUser } from "../mapper/user.mapper.js";


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

export const findStudentsByTeacher = async (teacherId) => {
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        throw new UserValidationError('invalid teacherId format');
    }
    logger.debug('userRepo.findStudentsByTeacher', { teacherId });

    const docs = await UserModel.find({
        assignedTeacher: new mongoose.Types.ObjectId(teacherId),
        role: { $nin: ['teacher', 'admin'] },
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
export const findStudentByIdForTeacher = async (teacherId, studentId) => {
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        throw new UserValidationError('invalid teacherId format');
    }
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new UserValidationError('invalid studentId format');
    }
 
    logger.debug('userRepo.findStudentByIdForTeacher', { teacherId, studentId });
 
    const doc = await UserModel.findOne({
        _id:             new mongoose.Types.ObjectId(studentId),
        assignedTeacher: new mongoose.Types.ObjectId(teacherId),
        role:            { $nin: ['teacher', 'admin'] },
    })
        .select('-password')
        .lean();
 
    if (!doc) throw new UserNotFoundError(studentId);
 
    logger.debug('userRepo.findStudentByIdForTeacher: found', { studentId });
    return toDomain(doc);
};
// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export const createUser = async (userData) => {
    logger.debug('userRepo.createUser', { email: userData._email ?? userData.email });

    const emailToCheck = (userData._email ?? userData.email).toLowerCase();
    const existing = await UserModel.findOne({ email: emailToCheck });
    if (existing) {
        logger.warn('userRepo.createUser: email already exists', { email: emailToCheck });
        throw new UserEmailAlreadyExistsError("UserEmailAlreadyExistsError");
    }

    // userData is already a User entity (as passed from createUserUsecase
    // and findOrCreateOAuthUser). The entity was re-wrapped unnecessarily.
    // toPersistence reads the private _fields directly so it works on any
    // User instance without re-construction.
    const user = userData instanceof User ? userData : new User(userData);
    const persistence = toPersistence(user);
    const [doc] = await UserModel.create([persistence]);

    logger.debug('userRepo.createUser: user saved', { id: doc._id });
    return toDomain(doc);
};

// ---------------------------------------------------------------------------
// Aliases — for dependency-injected callers (oauth_user.uc, send_noti_uc …)
// MUST be after createUser definition — const is not hoisted (TDZ).
// ---------------------------------------------------------------------------
export const findById    = findUserById;
export const findByEmail = findUserByEmail;
export const create      = createUser;

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
        { $push: { attachments: attachment } }, // FIX: was 'attachement' (typo) — data was written to a non-existent field
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

export const getTeacherDashboardStats = async (teacherId) => {
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        throw new UserValidationError('invalid teacherId format');
    }
 
    logger.debug('userRepo.getTeacherDashboardStats', { teacherId });
 
    const teacherObjId = new mongoose.Types.ObjectId(teacherId);
 
    // ── Student count ──────────────────────────────────────────────────────
    const studentCountResult = await UserModel.countDocuments({
        assignedTeacher: teacherObjId,
        role:            { $nin: ['teacher', 'admin'] },
    });
 
    // ── Task breakdown via aggregation on the WritingTask collection ───────
    // We run this directly on UserModel to stay inside user_repo, but use
    // $lookup to reach writingtasks.  If you prefer to keep task queries in
    // task_repo, move the block below there and merge the two results in the UC.
 
    const now            = new Date();
    const startOfMonth   = new Date(now.getFullYear(), now.getMonth(), 1);
 
    const [taskStats = {}] = await UserModel.aggregate([
        // Start from the single teacher document so the pipeline is cheap.
        { $match: { _id: teacherObjId, role: 'teacher' } },
 
        // Join all tasks assigned by this teacher.
        {
            $lookup: {
                from:     'writingtasks',           // ← adjust if collection name differs
                let:      { tid: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $or: [ { $eq: ['$assignedBy', '$$tid'] }, { $eq: ['$_assignedBy', '$$tid'] } ] },
                        },
                    },
                ],
                as: 'tasks',
            },
        },
 
        // Project counts from the joined tasks array.
        {
            $project: {
                _id:              0,
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
                            cond: {
                                $in: [
                                    '$$this.status',
                                    ['ASSIGNED', 'WRITING', 'assigned', 'writing'],
                                ],
                            },
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
 
    const stats = {
        studentCount:      studentCountResult,
        pendingReview:     taskStats.pendingReview     ?? 0,
        activeAssignments: taskStats.activeAssignments ?? 0,
        reviewedThisMonth: taskStats.reviewedThisMonth ?? 0,
    };
 
    logger.debug('userRepo.getTeacherDashboardStats: result', stats);
    return stats;
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
    try {
        if (!verifyPassword(password, doc.password)) {
            throw new InvalidCredentialsError();
        }
    } catch (err) {
        if (err instanceof InvalidCredentialsError) throw err;
        logger.warn('userRepo.authenticateUser: password verification error', { email, error: err.message });
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

// ---------------------------------------------------------------------------
// Search & Filter
// ---------------------------------------------------------------------------

/**
 * searchUsers({ q, role, status, from, to, page, limit })
 * Supports name/email text search + role/status/date filters with pagination.
 */
export const searchUsers = async ({ q, role, status, from, to, page = 1, limit = 20 } = {}) => {
    logger.debug('userRepo.searchUsers', { q, role, status, from, to, page, limit });

    const query = {};

    if (q) {
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
            { name:  { $regex: escaped, $options: 'i' } },
            { email: { $regex: escaped, $options: 'i' } },
        ];
    }

    if (role)   query.role   = role;
    if (status) query.status = status;  // expects 'active' | 'suspended'

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

    logger.debug('userRepo.searchUsers: result', { total, returned: docs.length });
    return {
        data:  docs.map(toDomain),
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
    };
};

// ---------------------------------------------------------------------------
// Suspension (soft disable — non-destructive alternative to delete)
// ---------------------------------------------------------------------------

/**
 * suspendUser(id)
 * Sets status = 'suspended'. The user can no longer log in but data is preserved.
 */
export const suspendUser = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new UserValidationError('invalid user id format');
    }
    logger.debug('userRepo.suspendUser', { id });
    const doc = await UserModel.findByIdAndUpdate(
        id,
        { status: 'suspended', updatedAt: new Date() },
        { returnDocument: 'after', runValidators: true }
    ).lean();
    if (!doc) throw new UserNotFoundError(id);
    logger.debug('userRepo.suspendUser: suspended', { id });
    return toDomain(doc);
};

/**
 * reactivateUser(id)
 * Lifts a suspension — sets status back to 'active'.
 */
export const reactivateUser = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new UserValidationError('invalid user id format');
    }
    logger.debug('userRepo.reactivateUser', { id });
    const doc = await UserModel.findByIdAndUpdate(
        id,
        { status: 'active', updatedAt: new Date() },
        { returnDocument: 'after', runValidators: true }
    ).lean();
    if (!doc) throw new UserNotFoundError(id);
    logger.debug('userRepo.reactivateUser: reactivated', { id });
    return toDomain(doc);
};

// ---------------------------------------------------------------------------
// Password reset (admin-forced)
// ---------------------------------------------------------------------------

/**
 * setPasswordResetRequired(id)
 * Flags the account so the next login flow forces a password change.
 * Does NOT change the actual password — auth middleware checks this flag.
 */
export const setPasswordResetRequired = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new UserValidationError('invalid user id format');
    }
    logger.debug('userRepo.setPasswordResetRequired', { id });
    const doc = await UserModel.findByIdAndUpdate(
        id,
        { mustResetPassword: true, updatedAt: new Date() },
        { returnDocument: 'after' }
    ).lean();
    if (!doc) throw new UserNotFoundError(id);
    return toDomain(doc);
};

// ---------------------------------------------------------------------------
// Role demotion
// ---------------------------------------------------------------------------

/**
 * demoteToStudent(id)
 * Strips teacher/admin role back to student and clears assignedTeacher linkage.
 * Use when removing a teacher from the system without deleting the account.
 */
export const demoteToStudent = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new UserValidationError('invalid user id format');
    }
    logger.debug('userRepo.demoteToStudent', { id });
    const doc = await UserModel.findByIdAndUpdate(
        id,
        { role: UserRole.USER, assignedTeacher: null, updatedAt: new Date() },
        { returnDocument: 'after', runValidators: true }
    ).lean();
    if (!doc) throw new UserNotFoundError(id);
    logger.debug('userRepo.demoteToStudent: demoted', { id });
    return toDomain(doc);
};

// ---------------------------------------------------------------------------
// Bulk operations
// ---------------------------------------------------------------------------

/**
 * bulkDeleteUsers(ids[])
 * Hard-deletes multiple users in a single DB round-trip.
 * Returns { deleted: n, notFound: [] }.
 */
export const bulkDeleteUsers = async (ids = []) => {
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    const invalid  = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalid.length) {
        throw new UserValidationError(`invalid id(s): ${invalid.join(', ')}`);
    }
    logger.debug('userRepo.bulkDeleteUsers', { count: validIds.length });
    const objectIds = validIds.map(id => new mongoose.Types.ObjectId(id));
    const { deletedCount } = await UserModel.deleteMany({ _id: { $in: objectIds } });
    logger.debug('userRepo.bulkDeleteUsers: done', { deletedCount });
    return { deleted: deletedCount };
};

/**
 * bulkSuspendUsers(ids[])
 * Suspends multiple users in a single DB round-trip.
 */
export const bulkSuspendUsers = async (ids = []) => {
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== ids.length) {
        throw new UserValidationError('one or more invalid id formats');
    }
    logger.debug('userRepo.bulkSuspendUsers', { count: validIds.length });
    const objectIds = validIds.map(id => new mongoose.Types.ObjectId(id));
    const { modifiedCount } = await UserModel.updateMany(
        { _id: { $in: objectIds } },
        { status: 'suspended', updatedAt: new Date() }
    );
    logger.debug('userRepo.bulkSuspendUsers: done', { modifiedCount });
    return { suspended: modifiedCount };
};

/**
 * bulkAssignTeacher(studentIds[], teacherId)
 * Reassigns multiple students to one teacher atomically.
 */
export const bulkAssignTeacher = async (studentIds = [], teacherId) => {
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        throw new UserValidationError('invalid teacherId format');
    }
    const validIds = studentIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== studentIds.length) {
        throw new UserValidationError('one or more invalid student id formats');
    }
    logger.debug('userRepo.bulkAssignTeacher', { studentCount: validIds.length, teacherId });
    const objectIds    = validIds.map(id => new mongoose.Types.ObjectId(id));
    const teacherObjId = new mongoose.Types.ObjectId(teacherId);
    const { modifiedCount } = await UserModel.updateMany(
        { _id: { $in: objectIds }, role: { $nin: ['teacher', 'admin'] } },
        { assignedTeacher: teacherObjId, updatedAt: new Date() }
    );
    logger.debug('userRepo.bulkAssignTeacher: done', { modifiedCount });
    return { assigned: modifiedCount };
};

// ---------------------------------------------------------------------------
// Teacher workload
// ---------------------------------------------------------------------------

/**
 * getTeacherWorkloads()
 * Returns each teacher with their student count — used for workload dashboard.
 * Uses an aggregation so it's a single query regardless of teacher count.
 */
export const getTeacherWorkloads = async () => {
    logger.debug('userRepo.getTeacherWorkloads');
    const rows = await UserModel.aggregate([
        { $match: { role: 'teacher' } },
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
    logger.debug('userRepo.getTeacherWorkloads: result', { count: rows.length });
    return rows.map(r => ({
        id:           r._id.toString(),
        name:         r.name,
        email:        r.email,
        studentCount: r.studentCount,
    }));
};

// ---------------------------------------------------------------------------
// User activity summary (per-user stats for admin view)
// ---------------------------------------------------------------------------

/**
 * getUserActivitySummary(id)
 * Returns task/submission counts and last-login for a single user.
 * Requires a 'tasks' collection with userId references — adjust pipeline
 * to match your actual Task model collection name if different.
 */
export const getUserActivitySummary = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new UserValidationError('invalid user id format');
    }
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
                status:      1,
                lastLoginAt: 1,
                createdAt:   1,
                taskTotal:      { $size: '$tasks' },
                taskSubmitted:  {
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
        id:             row._id.toString(),
        name:           row.name,
        email:          row.email,
        role:           row.role,
        status:         row.status ?? 'active',
        lastLoginAt:    row.lastLoginAt ?? null,
        createdAt:      row.createdAt,
        taskTotal:      row.taskTotal,
        taskSubmitted:  row.taskSubmitted,
        taskScored:     row.taskScored,
    };
};

// ---------------------------------------------------------------------------
// Last-login tracking
// ---------------------------------------------------------------------------

/**
 * updateLastLogin(id)
 * Called by auth layer after a successful login to stamp lastLoginAt.
 * Uses a targeted $set to avoid overwriting other fields.
 */
export const updateLastLogin = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new UserValidationError('invalid user id format');
    }
    logger.debug('userRepo.updateLastLogin', { id });
    await UserModel.findByIdAndUpdate(id, {
        $set: { lastLoginAt: new Date() },
    });
};