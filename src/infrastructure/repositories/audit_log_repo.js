// src/infrastructure/repositories/audit_log_repo.js
import mongoose from 'mongoose';
import AuditLogModel from '../../domain/models/audit_log_model.js';
import { AuditLog } from '../../domain/entities/audit_log_entity.js';
import logger from '../../core/logger/logger.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Only these fields may be used as sort keys in findLogs — prevents injection. */
const ALLOWED_SORT_FIELDS = new Set(['createdAt', 'action', 'outcome', 'requesterId']);
const ALLOWED_SORT_DIRS   = new Set([1, -1, 'asc', 'desc']);

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

const toDomain = (doc) => {
    if (!doc) return null;
    return new AuditLog({
        id:          doc._id.toString(),
        action:      doc.action,
        outcome:     doc.outcome,
        requesterId: doc.requesterId ? doc.requesterId.toString() : null,
        details:     doc.details ?? {},
        request:     doc.request   ?? null,
        createdAt:   doc.createdAt,
    });
};

const toDomainList = (docs) => docs.map(toDomain).filter((l) => l !== null);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validates and sanitizes a sort object so only whitelisted fields/directions
 * reach Mongoose. Falls back to `{ createdAt: -1 }` on any invalid input.
 *
 * @param {object} raw - e.g. { createdAt: -1 } or { action: 'asc' }
 * @returns {object} safe sort object
 */
const sanitizeSort = (raw) => {
    const DEFAULT_SORT = { createdAt: -1 };

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return DEFAULT_SORT;
    }

    const safe = {};
    for (const [field, dir] of Object.entries(raw)) {
        if (!ALLOWED_SORT_FIELDS.has(field)) {
            logger.warn('auditLogRepo.findLogs: disallowed sort field ignored', { field });
            continue;
        }
        if (!ALLOWED_SORT_DIRS.has(dir)) {
            logger.warn('auditLogRepo.findLogs: disallowed sort direction ignored', { field, dir });
            continue;
        }
        safe[field] = dir;
    }

    return Object.keys(safe).length ? safe : DEFAULT_SORT;
};

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Persist one audit entry.
 * Never throws — errors are swallowed so a failed write never crashes the
 * request that triggered the audit event.
 */
export const createLog = async ({
    action,
    outcome     = 'success',
    requesterId = null,
    details     = {},
    request     = null,
}) => {
    try {
        logger.debug('auditLogRepo.createLog', { action, outcome, requesterId });

        const doc = await AuditLogModel.create({
            action,
            outcome,
            requesterId: requesterId && mongoose.Types.ObjectId.isValid(requesterId)
                ? new mongoose.Types.ObjectId(requesterId)
                : null,
            details,
            request,
        });

        logger.debug('auditLogRepo.createLog: saved', { id: doc._id });
        return toDomain(doc);
    } catch (err) {
        logger.error('auditLogRepo.createLog: failed to persist', { error: err.message, action });
        return null;
    }
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Paginated, filterable audit log list for the admin dashboard.
 *
 * @param {object}       options
 * @param {string}       [options.action]       — exact action string e.g. 'admin.user.deleted'
 * @param {string}       [options.requesterId]  — filter by who performed the action
 * @param {string}       [options.outcome]      — 'success' | 'failure'
 * @param {Date|string}  [options.from]         — createdAt >= from
 * @param {Date|string}  [options.to]           — createdAt <= to
 * @param {number}       [options.page]
 * @param {number}       [options.limit]
 * @param {object}       [options.sort]         — e.g. { createdAt: -1 }
 *                                                Only whitelisted fields are accepted;
 *                                                invalid fields are silently dropped and
 *                                                the default { createdAt: -1 } is used.
 */
export const findLogs = async (options = {}) => {
    const {
        action,
        actionPrefix,   // e.g. 'writingTask.' — set by audit_service category filter
        requesterId,
        outcome,
        from,
        to,
        page  = 1,
        limit = 20,
        sort  = { createdAt: -1 },
    } = options;

    // ── #3: Sanitize sort before it reaches Mongoose ─────────────────────────
    const safeSort = sanitizeSort(sort);

    const skip  = (Math.max(1, Number(page)) - 1) * Number(limit);
    const query = {};

    // Exact action match takes priority; actionPrefix is the category fallback
    if (action)            query.action = action;
    else if (actionPrefix) query.action = { $regex: `^${actionPrefix}`, $options: 'i' };
    if (outcome) query.outcome = outcome;

    if (requesterId) {
        if (!mongoose.Types.ObjectId.isValid(requesterId)) {
            logger.warn('auditLogRepo.findLogs: invalid requesterId', { requesterId });
        } else {
            query.requesterId = new mongoose.Types.ObjectId(requesterId);
        }
    }

    if (from || to) {
        query.createdAt = {};
        if (from) query.createdAt.$gte = new Date(from);
        if (to)   query.createdAt.$lte = new Date(to);
    }

    logger.debug('auditLogRepo.findLogs', { query, page, limit, sort: safeSort });

    const [docs, total] = await Promise.all([
        AuditLogModel.find(query).skip(skip).limit(Number(limit)).sort(safeSort).lean(),
        AuditLogModel.countDocuments(query),
    ]);

    logger.debug('auditLogRepo.findLogs: result', { count: docs.length, total });

    return {
        logs:  toDomainList(docs),
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
    };
};