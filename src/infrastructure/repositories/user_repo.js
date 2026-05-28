import UserModel from "../models/user_model.js";
import mongoose  from 'mongoose';
import { User }  from '../../domain/entities/user_entity.js';
import { UserRole } from "../../domain/base/user_enums.js";
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
// Inline Mapping Helpers  (private to this module — not exported)
//
// toDomain  — Mongoose lean doc  →  User domain entity
// toDoc     — User domain entity →  plain object ready for Mongoose
// sanitize  — strips password before returning to callers outside auth
//
// Keeping mapping here means zero external mapper dependency.
// If the schema changes, you update ONE file.
// ---------------------------------------------------------------------------

/**
 * Convert a raw Mongoose lean document into a domain User entity.
 * Always call User.reconstitute() so the guard token is respected and
 * no validation is re-run on already-persisted data.
 */
const toDomain = (doc) => User.reconstitute({
    id:              doc._id.toString(),
    name:            doc.name,
    email:           doc.email,
    password:        doc.password        ?? null,
    role:            doc.role            ?? UserRole.USER,
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
    assignedTeacher: doc.assignedTeacher?.toString() ?? null,
    isVerified:      doc.isVerified      ?? false,
    isActive:        doc.isActive        ?? true,
});

/**
 * Convert a domain User entity into a plain object for Mongoose writes.
 * Reads through the public getters — no touching private # fields.
 */
const toDoc = (user) => ({
    name:            user.name,
    email:           user.email,
    password:        user.password,
    role:            user.role,
    provider:        user.provider,
    providerId:      user.providerId,
    avatarUrl:       user.avatarUrl,
    coverUrl:        user.coverUrl,
    bio:             user.bio,
    targetBand:      user.targetBand,
    examDate:        user.examDate,
    attachments:     user.attachments,
    assignedTeacher: user.assignedTeacher,
    isVerified:      user.isVerified,
    isActive:        user.isActive,
    updatedAt:       user.updatedAt,
});

/**
 * Return the entity with password zeroed out.
 * Use for any response that leaves the auth layer.
 */
const sanitize = (user) => User.reconstitute({
    id:              user.id,
    name:            user.name,
    email:           user.email,
    password:        null,           // ← scrubbed
    role:            user.role,
    provider:        user.provider,
    providerId:      user.providerId,
    avatarUrl:       user.avatarUrl,
    coverUrl:        user.coverUrl,
    bio:             user.bio,
    targetBand:      user.targetBand,
    examDate:        user.examDate,
    attachments:     user.attachments,
    createdAt:       user.createdAt,
    updatedAt:       user.updatedAt,
    assignedTeacher: user.assignedTeacher,
    isVerified:      user.isVerified,
    isActive:        user.isActive,
});

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
 * Only used by authenticateUser — never expose the result to HTTP layer.
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
 * findAll({ assignedTeacher?, role? })
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
 * findStudentsByTeacher(teacherId)
 * Returns a lightweight { id, name, email } list — no full entity needed here.
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
 * findStudentByIdForTeacher(teacherId, studentId)
 * Verifies ownership before returning the full student entity.
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
    logger.debug('userRepo.findStudentByIdForTeacher: found', { studentId });
    return toDomain(doc);
};

// ===========================================================================
// Writes
// ===========================================================================

/**
 * createUser(user)
 * Accepts a fully-constructed User entity (from User.create or User.createOAuth).
 * Checks for duplicate email, then persists.
 */
export const createUser = async (user) => {
    // Accept either a ready User entity or a raw props object (backward compat).
    const entity = user instanceof User ? user : User.create(user);

    logger.debug('userRepo.createUser', { email: entity.email });

    const existing = await UserModel.findOne({ email: entity.email });
    if (existing) {
        logger.warn('userRepo.createUser: email already exists', { email: entity.email });
        throw new UserEmailAlreadyExistsError(entity.email);
    }

    const [doc] = await UserModel.create([toDoc(entity)]);
    logger.debug('userRepo.createUser: saved', { id: doc._id });
    return toDomain(doc);
};

// ---------------------------------------------------------------------------
// Aliases — kept for callers using the short names (oauth_user.uc, etc.)
// Must be defined AFTER the functions they alias (no hoisting for const).
// ---------------------------------------------------------------------------
export const findById    = findUserById;
export const findByEmail = findUserByEmail;
export const create      = createUser;

/**
 * updateUser(id, mutate)
 *
 * The `mutate` parameter is a callback that receives the current User entity
 * and calls domain methods on it.  The repo then persists whatever the entity
 * looks like after the callback returns.
 *
 * This design means:
 *   • The repo never touches # private fields directly.
 *   • All business rules (validation, updatedAt stamping) stay on the entity.
 *   • The caller is explicit about what it is changing.
 *
 * Example:
 *   await updateUser(id, (u) => u.updateProfile({ name, bio }));
 *   await updateUser(id, (u) => { u.verify(); });
 *   await updateUser(id, (u) => u.assignTeacher(teacherId));
 */
export const updateUser = async (id, mutate) => {
    assertValidId(id);
    logger.debug('userRepo.updateUser', { id });

    // Load current state — password excluded (not needed for profile updates).
    const user = await findUserById(id);

    // Let the caller apply domain methods.
    mutate(user);

    // Persist the mutated entity state.
    const doc = await UserModel.findByIdAndUpdate(
        id,
        { $set: toDoc(user) },
        { returnDocument: 'after', runValidators: true }
    ).lean();

    if (!doc) throw new UserNotFoundError(id);
    logger.debug('userRepo.updateUser: updated', { id });
    return toDomain(doc);
};

// ---------------------------------------------------------------------------
// Profile-specific convenience wrappers
// Each one calls updateUser with the right domain method — no duplication.
// ---------------------------------------------------------------------------

export const updateProfileInfo = async (id, fields) => {
    logger.debug('userRepo.updateProfileInfo', { id });
    return updateUser(id, (u) => u.updateProfile(fields));
};

export const updateAvatarUrl = async (id, avatarUrl) => {
    logger.debug('userRepo.updateAvatarUrl', { id });
    return updateUser(id, (u) => u.setAvatarUrl(avatarUrl));
};

export const updateCoverUrl = async (id, coverUrl) => {
    logger.debug('userRepo.updateCoverUrl', { id });
    return updateUser(id, (u) => u.setCoverUrl(coverUrl));
};

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

/**
 * addAttachment(id, attachment)
 * Uses $push for an atomic single-document array append — no full re-write needed.
 */
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

/**
 * removeAttachment(userId, fileId)
 * Uses $pull for an atomic single-document array removal.
 */
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
// Auth
// ===========================================================================

/**
 * authenticateUser(email, password)
 * Loads the full document (with password hash), verifies, then scrubs
 * the hash before returning.  Password never leaves this function.
 */
export const authenticateUser = async (email, password) => {
    logger.debug('userRepo.authenticateUser', { email });

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
    return sanitize(toDomain(doc));
};

// ===========================================================================
// Role management
// ===========================================================================

/**
 * promoteToAdmin(id)
 * Calls the domain method on the entity so the guard (already admin?) is enforced.
 */
export const promoteToAdmin = async (id) => {
    logger.debug('userRepo.promoteToAdmin', { id });
    return updateUser(id, (u) => u.promoteToAdmin());
};

/**
 * demoteToStudent(id)
 * Strips teacher/admin role back to USER and clears the teacher assignment.
 */
export const demoteToStudent = async (id) => {
    logger.debug('userRepo.demoteToStudent', { id });
    return updateUser(id, (u) => u.demoteToUser());
};

// ===========================================================================
// Activation / verification
// ===========================================================================

/**
 * verifyUser(id)
 * Marks the account as email-verified via the domain method.
 */
export const verifyUser = async (id) => {
    logger.debug('userRepo.verifyUser', { id });
    return updateUser(id, (u) => u.verify());
};

/**
 * deactivateUser(id)
 * Soft-disables the account.  Data preserved; login blocked.
 */
export const deactivateUser = async (id) => {
    logger.debug('userRepo.deactivateUser', { id });
    return updateUser(id, (u) => u.deactivate());
};

/**
 * reactivateUser(id)
 * Lifts a deactivation.
 */
export const reactivateUser = async (id) => {
    logger.debug('userRepo.reactivateUser', { id });
    return updateUser(id, (u) => u.reactivate());
};

// ===========================================================================
// Delete
// ===========================================================================

export const deleteUser = async (id) => {
    assertValidId(id);
    logger.debug('userRepo.deleteUser', { id });
    const doc = await UserModel.findByIdAndDelete(id).lean();
    if (!doc) throw new UserNotFoundError(id);
    logger.debug('userRepo.deleteUser: deleted', { id });
    return { deleted: true };
};

// ===========================================================================
// Password management
// ===========================================================================

/**
 * changePassword(id, hashedPassword)
 * The hashing must be done by the use case BEFORE calling this.
 * The repo only stores; it never hashes.
 */
export const changePassword = async (id, hashedPassword) => {
    logger.debug('userRepo.changePassword', { id });
    return updateUser(id, (u) => u.changePassword(hashedPassword));
};

/**
 * setPasswordResetRequired(id)
 * Flags the account so the next login forces a password change.
 * Uses a targeted $set — no full entity load needed.
 */
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

// ===========================================================================
// Teacher assignment
// ===========================================================================

export const assignTeacher = async (studentId, teacherId) => {
    logger.debug('userRepo.assignTeacher', { studentId, teacherId });
    return updateUser(studentId, (u) => u.assignTeacher(teacherId));
};

// ===========================================================================
// Search & filter (with pagination)
// ===========================================================================

/**
 * searchUsers({ q, role, isActive, from, to, page, limit })
 * Supports name/email text search + role/status/date filters.
 * Note: filter key is now `isActive` (boolean) to match the schema field.
 */
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

    if (role                !== undefined) query.role     = role;
    if (isActive            !== undefined) query.isActive = isActive;

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

// ===========================================================================
// Bulk operations
// ===========================================================================

/**
 * bulkDeleteUsers(ids[])
 * Hard-deletes multiple users in a single DB round-trip.
 */
export const bulkDeleteUsers = async (ids = []) => {
    const invalid = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalid.length) throw new UserValidationError(`invalid id(s): ${invalid.join(', ')}`);

    logger.debug('userRepo.bulkDeleteUsers', { count: ids.length });
    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
    const { deletedCount } = await UserModel.deleteMany({ _id: { $in: objectIds } });
    logger.debug('userRepo.bulkDeleteUsers: done', { deletedCount });
    return { deleted: deletedCount };
};

/**
 * bulkDeactivateUsers(ids[])
 * Soft-disables multiple users atomically.
 * Uses isActive (schema field) — replaces the old status:'suspended' approach.
 */
export const bulkDeactivateUsers = async (ids = []) => {
    const invalid = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalid.length) throw new UserValidationError('one or more invalid id formats');

    logger.debug('userRepo.bulkDeactivateUsers', { count: ids.length });
    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
    const { modifiedCount } = await UserModel.updateMany(
        { _id: { $in: objectIds } },
        { $set: { isActive: false, updatedAt: new Date() } }
    );
    logger.debug('userRepo.bulkDeactivateUsers: done', { modifiedCount });
    return { deactivated: modifiedCount };
};

/**
 * bulkAssignTeacher(studentIds[], teacherId)
 * Reassigns multiple students to one teacher atomically.
 */
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
    logger.debug('userRepo.bulkAssignTeacher: done', { modifiedCount });
    return { assigned: modifiedCount };
};

// ===========================================================================
// Analytics / Aggregations
// ===========================================================================

/**
 * getTeacherWorkloads()
 * Returns each teacher with their student count — used for workload dashboard.
 */
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
    logger.debug('userRepo.getTeacherWorkloads: result', { count: rows.length });
    return rows.map((r) => ({
        id:           r._id.toString(),
        name:         r.name,
        email:        r.email,
        studentCount: r.studentCount,
    }));
};

/**
 * getTeacherDashboardStats(teacherId)
 * Student count + task breakdown for a single teacher's dashboard.
 */
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
                from:     'writingtasks',   // ← adjust if collection name differs
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

    const stats = {
        studentCount,
        pendingReview:     taskStats.pendingReview     ?? 0,
        activeAssignments: taskStats.activeAssignments ?? 0,
        reviewedThisMonth: taskStats.reviewedThisMonth ?? 0,
    };
    logger.debug('userRepo.getTeacherDashboardStats: result', stats);
    return stats;
};

/**
 * getUserActivitySummary(id)
 * Task counts + last-login for a single user — used by admin view.
 */
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

// ===========================================================================
// Last-login tracking
// ===========================================================================

/**
 * updateLastLogin(id)
 * Targeted $set — does not load or mutate the full entity.
 */
export const updateLastLogin = async (id) => {
    assertValidId(id);
    logger.debug('userRepo.updateLastLogin', { id });
    await UserModel.findByIdAndUpdate(
        id,
        { $set: { lastLoginAt: new Date() } }
    );
};