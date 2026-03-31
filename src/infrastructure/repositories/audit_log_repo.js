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

    // or a plain ObjectId string (from createLog). Handle both shapes.
    let actorId    = null;
    let actorLabel = null;

    if (doc.requesterId && typeof doc.requesterId === 'object' && doc.requesterId._id) {
        // populated
        actorId    = doc.requesterId._id.toString();
        actorLabel = doc.requesterId.email ?? doc.requesterId.name ?? actorId;
    } else if (doc.requesterId) {
        actorId    = doc.requesterId.toString();
        actorLabel = actorId;
    }

    return new AuditLog({
        id:          doc._id.toString(),
        action:      doc.action,
        outcome:     doc.outcome,
        requesterId: actorId,
        actorLabel,          // new field — display-friendly actor string
        details:     doc.details ?? {},
        request:     doc.request ?? null,
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
 * Changes vs original:
 *   fix #4 — .populate('requesterId', 'email name') so the UI gets a readable actor
 *   fix #7 — `to` date is pushed to 23:59:59.999 so the whole day is included
 */
export const findLogs = async (options = {}) => {
    const {
        action,
        actionPrefix,
        requesterId,
        outcome,
        from,
        to,
        page  = 1,
        limit = 20,
        sort  = { createdAt: -1 },
    } = options;

    const safeSort = sanitizeSort(sort);
    const skip     = (Math.max(1, Number(page)) - 1) * Number(limit);
    const query    = {};

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
        if (to) {
            // fix #7: push end of day to 23:59:59.999 so the selected date is fully included
            const toDate = new Date(to);
            toDate.setHours(23, 59, 59, 999);
            query.createdAt.$lte = toDate;
        }
    }

    logger.debug('auditLogRepo.findLogs', { query, page, limit, sort: safeSort });

    const [docs, total] = await Promise.all([
        AuditLogModel
            .find(query)
            .skip(skip)
            .limit(Number(limit))
            .sort(safeSort)
            .populate('requesterId', 'email name')  // fix #4: pull actor display info
            .lean(),
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