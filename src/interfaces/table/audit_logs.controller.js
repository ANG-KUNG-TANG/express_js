// src/interfaces/controllers/audit_log.controller.js
import { getAuditLogs, getAuditActionList } from '../../core/services/audit.service.js';
import { sendSuccess }                       from '../response_formatter.js';
import { HTTP_STATUS }                       from '../http_status.js';
import logger                                from '../../core/logger/logger.js';

// ---------------------------------------------------------------------------
// GET /api/admin/audit-logs
// ---------------------------------------------------------------------------
// Query params (all optional):
//   action       — exact action value e.g. 'writingTask.created'
//   category     — shorthand prefix filter: auth | admin | user | task | teacher | vocab | profile
//   requesterId  — filter by the user who performed the action
//   outcome      — 'success' | 'failure'
//   from         — ISO date string  (createdAt >=)
//   to           — ISO date string  (createdAt <=)
//   page         — default 1
//   limit        — default 20, max 100
//   sortBy       — 'createdAt' | 'action' | 'outcome' | 'requesterId'  (default: createdAt)
//   sortOrder    — 'asc' | 'desc'  (default: desc)
// ---------------------------------------------------------------------------

export const listAuditLogs = async (req, res) => {
    const {
        action,
        category,
        requesterId,
        outcome,
        from,
        to,
        page     = 1,
        limit    = 20,
        sortBy   = 'createdAt',
        sortOrder = 'desc',
    } = req.query;

    logger.debug('auditLog.list called', { requestId: req.id, requesterId: req.user?.id, query: req.query });

    // Cap limit so one request can't pull the entire collection
    const safeLimit = Math.min(Number(limit), 100);

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const result = await getAuditLogs({
        action,
        category,
        requesterId,
        outcome,
        from,
        to,
        page: Number(page),
        limit: safeLimit,
        sort,
    });

    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// GET /api/admin/audit-logs/actions
// Returns every valid AuditAction value for populating filter dropdowns.
// ---------------------------------------------------------------------------

export const listAuditActions = (req, res) => {
    logger.debug('auditLog.listActions called', { requestId: req.id });
    return sendSuccess(res, getAuditActionList(), HTTP_STATUS.OK);
};