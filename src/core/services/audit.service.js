import auditLogger from '../logger/audit.logger.js';
import { AuditAction, isKnownAction } from '../../domain/base/audit_enums.js';
import { findLogs } from '../../infrastructure/repositories/audit_log_repo.js';

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export const recordAudit = (action, requesterId, details = {}, req = null) => {
    auditLogger.log(action, { requesterId, ...details }, req);
};

export const recordFailure = (action, requesterId, details = {}, req = null) => {
    auditLogger.failure(action, { requesterId, ...details }, req);
};

// ---------------------------------------------------------------------------
// Reads  (admin dashboard)
// ---------------------------------------------------------------------------

/**
 * Retrieve a paginated, filtered list of audit logs.
 *
 * Accepts the same filter shape that audit_log_repo.findLogs() supports:
 *   action, requesterId, outcome, from, to, page, limit, sort
 *
 * Additionally accepts `category` as a convenience shorthand:
 *   'auth'    → filters to all actions whose value starts with 'auth.'
 *   'admin'   → 'admin.'
 *   'user'    → 'user.'
 *   'task'    → 'writingTask.'
 *   'teacher' → 'teacher.'
 *   'vocab'   → 'vocab.'
 *
 * When `category` is supplied AND no explicit `action` filter is given,
 * the repo receives an `actionPrefix` that the repo resolves with a regex.
 * If both `category` and `action` are supplied, `action` wins.
 *
 * @param {object} filters
 * @returns {Promise<{ logs, total, page, limit, pages }>}
 */

const CATEGORY_PREFIXES = {
    auth:    'auth.',
    admin:   'admin.',
    user:    'user.',
    task:    'writingTask.',
    teacher: 'teacher.',
    vocab:   'vocab.',
    profile: 'profile.',
};

export const getAuditLogs = async (filters = {}) => {
    const { category, action, ...rest } = filters;

    // Resolve category → actionPrefix only when no explicit action is given
    const resolvedAction      = action ?? null;
    const resolvedActionPrefix =
        !resolvedAction && category
            ? (CATEGORY_PREFIXES[category] ?? null)
            : null;

    return findLogs({
        ...rest,
        ...(resolvedAction       && { action: resolvedAction }),
        ...(resolvedActionPrefix && { actionPrefix: resolvedActionPrefix }),
    });
};

/**
 * Returns the full list of valid AuditAction values so the frontend
 * can populate a filter dropdown without hard-coding strings.
 */
export const getAuditActionList = () => Object.entries(AuditAction).map(([key, value]) => ({
    key,       // e.g. 'TASK_CREATED'
    value,     // e.g. 'writingTask.created'
    category:  value.split('.')[0],   // e.g. 'writingTask'
}));