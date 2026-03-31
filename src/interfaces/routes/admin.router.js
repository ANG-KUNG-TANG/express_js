import { Router }       from 'express';
import { asyncHandler } from '../async_handler.js';
import { authenticate } from '../../middleware/auth.middelware.js';
import { requireRole }  from '../../middleware/role.middleware.js';
import {
    getDashboardStats,
    listUsers, getUserByEmail, promoteUser, assignTeacher, deleteUser,
    listTasks, searchTasks, reviewTask, scoreTask, transferTasks,
    linkStudentToTeacher, unlinkStudentFromTeacher,
    listFlags, flagContent, resolveFlag, deleteContent,
    listAuditLogs,
    sendNotification,
} from '../table/admin.controller.js';
import {
    sanitizeReviewTask, sanitizeScoreTask, sanitizeTransferTasks,
    sanitizeFlagContent, sanitizeResolveFlag,
    sanitizeListAuditLogs, sanitizeSendNotification,
} from '../input_sanitizers/admin.input.sanitizer.js';

const router = Router();

// All routes require valid JWT + admin role
router.use(authenticate, requireRole('admin'));

// ── Dashboard ──────────────────────────────────────────────────────────────
router.get('/stats',                               asyncHandler(getDashboardStats));

// ── Users ──────────────────────────────────────────────────────────────────
router.get('/users',                               asyncHandler(listUsers));
router.get('/users/email/:email',                  asyncHandler(getUserByEmail));
router.patch('/users/:id/promote',                 asyncHandler(promoteUser));
router.patch('/users/:id/assign-teacher',          asyncHandler(assignTeacher));
router.patch('/users/:id/link-teacher',            asyncHandler(linkStudentToTeacher));
router.patch('/users/:id/unlink-teacher',          asyncHandler(unlinkStudentFromTeacher));
router.delete('/users/:id',                        asyncHandler(deleteUser));

// ── Writing Tasks ──────────────────────────────────────────────────────────
router.get('/writing-tasks',                       asyncHandler(listTasks));
router.get('/writing-tasks/search',                asyncHandler(searchTasks));
router.patch('/writing-tasks/:id/review',          sanitizeReviewTask,    asyncHandler(reviewTask));
router.patch('/writing-tasks/:id/score',           sanitizeScoreTask,     asyncHandler(scoreTask));
router.post('/writing-tasks/transfer',             sanitizeTransferTasks, asyncHandler(transferTasks));

// ── Content moderation ─────────────────────────────────────────────────────
router.get('/flags',                               asyncHandler(listFlags));
router.post('/flags',                              sanitizeFlagContent,   asyncHandler(flagContent));
router.post('/flags/:flagId/resolve',              sanitizeResolveFlag,   asyncHandler(resolveFlag));
router.delete('/content/:taskId',                  asyncHandler(deleteContent));

// ── Audit logs ─────────────────────────────────────────────────────────────
router.get('/audit-logs',                          sanitizeListAuditLogs,    asyncHandler(listAuditLogs));

// ── Notifications ──────────────────────────────────────────────────────────
router.post('/notifications',                      sanitizeSendNotification, asyncHandler(sendNotification));

export default router;