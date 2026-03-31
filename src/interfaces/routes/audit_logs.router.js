// src/interfaces/routes/admin/audit_log.routes.js
import { Router }                          from 'express';
import { listAuditActions, listAuditLogs } from '../table/audit_logs.controller.js';
import { authenticate }                    from '../../middleware/auth.middelware.js';
import { requireRole }                     from '../../middleware/role.middleware.js';

const router = Router();

// All audit-log routes require a valid session AND admin role
router.use(authenticate, requireRole('admin'));

/**
 * GET /api/admin/audit-logs/actions
 * Must come BEFORE / to avoid being swallowed by a catch-all param.
 * Returns the full AuditAction enum list for frontend filter dropdowns.
 */
router.get('/actions', listAuditActions);

/**
 * GET /api/admin/audit-logs
 * Paginated, filterable audit log list.
 *
 * Supported query params:
 *   action, category, requesterId, outcome, from, to,
 *   page, limit (max 100), sortBy, sortOrder
 */
router.get('/', listAuditLogs);

export default router;