// src/interfaces/routes/admin/audit_log.routes.js
import { Router }           from 'express';
import { listAuditLogs, listAuditActions } from '../table/admin.controller.js';
import { authenticate } from '../../middleware/auth.middelware.js';
import { requireRole }      from '../../middleware/role.middleware.js';

const router = Router();

// All audit-log routes require a valid session AND admin role
router.use(authenticate, requireRole('admin'));

/**
 * GET /api/admin/audit-logs/actions
 * Must come BEFORE /:id-style routes to avoid being swallowed by a param.
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