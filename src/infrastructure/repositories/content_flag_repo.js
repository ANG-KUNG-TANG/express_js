// src/infrastructure/repositories/content_flag_repo.js
import mongoose from 'mongoose';
import ContentFlagModel from '../../domain/models/content_flag_model.js';
import { ContentFlag, FlagSeverity, FlagStatus } from '../../domain/entities/content_flag_entity.js';
import {
    ContentFlagNotFoundError,
    ContentFlagInvalidIdError,
    ContentFlagInvalidTaskIdError,
    ContentFlagAlreadyResolvedError,
    ContentFlagValidationError,
} from '../../core/errors/content_flag.errors.js';
import logger from '../../core/logger/logger.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_SORT_FIELDS = new Set(['createdAt', 'severity', 'status', 'updatedAt']);
const ALLOWED_SORT_DIRS   = new Set([1, -1, 'asc', 'desc']);
const DEFAULT_SORT        = { createdAt: -1 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sanitizeSort = (raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return DEFAULT_SORT;
    const safe = {};
    for (const [field, dir] of Object.entries(raw)) {
        if (!ALLOWED_SORT_FIELDS.has(field)) {
            logger.warn('contentFlagRepo: disallowed sort field ignored', { field });
            continue;
        }
        if (!ALLOWED_SORT_DIRS.has(dir)) {
            logger.warn('contentFlagRepo: disallowed sort direction ignored', { field, dir });
            continue;
        }
        safe[field] = dir;
    }
    return Object.keys(safe).length ? safe : DEFAULT_SORT;
};

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

const toDomain = (doc) => {
    if (!doc) return null;
    return new ContentFlag({
        id:          doc._id.toString(),
        taskId:      doc.taskId    ? doc.taskId.toString()    : null,
        taskTitle:   doc.taskTitle ?? null,
        flaggedBy:   doc.flaggedBy ? doc.flaggedBy.toString() : null,
        reason:      doc.reason,
        severity:    doc.severity,
        status:      doc.status,
        resolvedBy:  doc.resolvedBy ? doc.resolvedBy.toString() : null,
        resolvedAt:  doc.resolvedAt ?? null,
        createdAt:   doc.createdAt,
        updatedAt:   doc.updatedAt,
    });
};

const toDomainList = (docs) => docs.map(toDomain).filter((f) => f !== null);

// Use public getters — never access private _fields from outside the entity
const toPersistence = (flag) => ({
    taskId:     flag.taskId    ? new mongoose.Types.ObjectId(flag.taskId)    : null,
    taskTitle:  flag.taskTitle ?? null,
    flaggedBy:  flag.flaggedBy ? new mongoose.Types.ObjectId(flag.flaggedBy) : null,
    reason:     flag.reason,
    severity:   flag.severity,
    status:     flag.status,
    resolvedBy: flag.resolvedBy ? new mongoose.Types.ObjectId(flag.resolvedBy) : null,
    resolvedAt: flag.resolvedAt ?? null,
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const findFlagById = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new ContentFlagInvalidIdError(id);
    logger.debug('contentFlagRepo.findFlagById', { id });
    const doc = await ContentFlagModel.findById(id).lean();
    if (!doc) throw new ContentFlagNotFoundError(id);
    return toDomain(doc);
};

/**
 * Paginated list of flags.
 *
 * @param {object}                      options
 * @param {'open'|'resolved'}           [options.status]
 * @param {'low'|'medium'|'high'}       [options.severity]
 * @param {string}                      [options.taskId]     — filter by task
 * @param {string}                      [options.flaggedBy]  — filter by admin
 * @param {number}                      [options.page]
 * @param {number}                      [options.limit]
 * @param {object}                      [options.sort]
 * @returns {Promise<{ flags, total, page, limit, pages }>}
 */
export const findFlags = async (options = {}) => {
    const {
        status,
        severity,
        taskId,
        flaggedBy,
        page  = 1,
        limit = 20,
        sort  = DEFAULT_SORT,
    } = options;

    const safeSort = sanitizeSort(sort);
    const skip     = (Math.max(1, Number(page)) - 1) * Number(limit);
    const query    = {};

    if (status)   query.status   = status;
    if (severity) query.severity = severity;

    if (taskId) {
        if (!mongoose.Types.ObjectId.isValid(taskId)) throw new ContentFlagInvalidTaskIdError(taskId);
        query.taskId = new mongoose.Types.ObjectId(taskId);
    }

    if (flaggedBy) {
        if (!mongoose.Types.ObjectId.isValid(flaggedBy)) throw new ContentFlagInvalidIdError(flaggedBy);
        query.flaggedBy = new mongoose.Types.ObjectId(flaggedBy);
    }

    logger.debug('contentFlagRepo.findFlags', { query, page, limit, sort: safeSort });

    const [docs, total] = await Promise.all([
        ContentFlagModel.find(query).skip(skip).limit(Number(limit)).sort(safeSort).lean(),
        ContentFlagModel.countDocuments(query),
    ]);

    logger.debug('contentFlagRepo.findFlags: result', { count: docs.length, total });

    return {
        flags: toDomainList(docs),
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
    };
};

export const findOpenFlags = (options = {}) =>
    findFlags({ ...options, status: FlagStatus.OPEN });

export const findFlagsByTask = (taskId, options = {}) =>
    findFlags({ ...options, taskId });

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export const createFlag = async ({
    taskId,
    taskTitle = null,
    flaggedBy,
    reason,
    severity  = FlagSeverity.MEDIUM,
}) => {
    if (!mongoose.Types.ObjectId.isValid(taskId))    throw new ContentFlagInvalidTaskIdError(taskId);
    if (!mongoose.Types.ObjectId.isValid(flaggedBy)) throw new ContentFlagInvalidIdError(flaggedBy);
    if (!reason?.trim()) throw new ContentFlagValidationError('reason is required');

    logger.debug('contentFlagRepo.createFlag', { taskId, flaggedBy, severity });

    const flag = new ContentFlag({
        taskId,
        taskTitle,
        flaggedBy,
        reason: reason.trim(),
        severity,
    });

    try {
        const [doc] = await ContentFlagModel.create([toPersistence(flag)]);
        logger.debug('contentFlagRepo.createFlag: saved', { id: doc._id });
        return toDomain(doc);
    } catch (err) {
        if (err.name === 'ValidationError') {
            const message = Object.values(err.errors).map((e) => e.message).join(', ');
            throw new ContentFlagValidationError(message);
        }
        logger.error('contentFlagRepo.createFlag: unexpected error', { error: err.message });
        throw err;
    }
};

/**
 * Mark a flag as resolved.
 * Throws ContentFlagAlreadyResolvedError if already resolved.
 */
export const resolveFlag = async (flagId, resolvedBy) => {
    if (!mongoose.Types.ObjectId.isValid(flagId))     throw new ContentFlagInvalidIdError(flagId);
    if (!mongoose.Types.ObjectId.isValid(resolvedBy)) throw new ContentFlagInvalidIdError(resolvedBy);

    logger.debug('contentFlagRepo.resolveFlag', { flagId, resolvedBy });

    const existing = await ContentFlagModel.findById(flagId).lean();
    if (!existing) throw new ContentFlagNotFoundError(flagId);
    if (existing.status === FlagStatus.RESOLVED) throw new ContentFlagAlreadyResolvedError(flagId);

    const doc = await ContentFlagModel.findByIdAndUpdate(
        flagId,
        {
            $set: {
                status:     FlagStatus.RESOLVED,
                resolvedBy: new mongoose.Types.ObjectId(resolvedBy),
                resolvedAt: new Date(),
            },
        },
        { returnDocument: 'after', runValidators: true }
    ).lean();

    logger.debug('contentFlagRepo.resolveFlag: resolved', { flagId });
    return toDomain(doc);
};

/**
 * Hard-delete a flag document (admin correction only — not the task itself).
 */
export const deleteFlag = async (flagId) => {
    if (!mongoose.Types.ObjectId.isValid(flagId)) throw new ContentFlagInvalidIdError(flagId);
    logger.debug('contentFlagRepo.deleteFlag', { flagId });
    const doc = await ContentFlagModel.findByIdAndDelete(flagId).lean();
    if (!doc) throw new ContentFlagNotFoundError(flagId);
    logger.debug('contentFlagRepo.deleteFlag: deleted', { flagId });
    return toDomain(doc);
};

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export const countFlagsByStatus = async () => {
    logger.debug('contentFlagRepo.countFlagsByStatus');
    const result = await ContentFlagModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(result.map((r) => [r._id, r.count]));
};

export const countFlagsBySeverity = async () => {
    logger.debug('contentFlagRepo.countFlagsBySeverity');
    const result = await ContentFlagModel.aggregate([
        { $match:  { status: FlagStatus.OPEN } },
        { $group:  { _id: '$severity', count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(result.map((r) => [r._id, r.count]));
};