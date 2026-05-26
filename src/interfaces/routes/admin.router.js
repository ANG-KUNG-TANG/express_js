import { Router }       from 'express';
import { asyncHandler } from '../async_handler.js';
import { authenticate } from '../../middleware/authenticate.middelware.js';
import { requireRole }  from '../../middleware/role.middleware.js';
import {
    getDashboardStats,
    // ── Users ────────────────────────────────────────────────────────────────
    listUsers, getUserByEmail, promoteUser, assignTeacher, deleteUser,
    linkStudentToTeacher, unlinkStudentFromTeacher,
    // ── Users — new ──────────────────────────────────────────────────────────
    searchUsers,
    suspendUser, reactivateUser,
    forcePasswordReset,
    demoteUser,
    bulkDeleteUsers, bulkSuspendUsers, bulkAssignTeacher,
    getUserActivity,
    // ── Tasks ────────────────────────────────────────────────────────────────
    listTasks, searchTasks, reviewTask, scoreTask, transferTasks,
    // ── Flags / content ──────────────────────────────────────────────────────
    listFlags, flagContent, resolveFlag, deleteContent,
    // ── Audit ────────────────────────────────────────────────────────────────
    listAuditLogs,
    // ── Notifications ────────────────────────────────────────────────────────
    sendNotification,
    // ── Teachers ─────────────────────────────────────────────────────────────
    getTeacherWorkloads,
} from '../table/admin.controller.js';
import {
    sanitizeReviewTask, sanitizeScoreTask, sanitizeTransferTasks,
    sanitizeFlagContent, sanitizeResolveFlag,
    sanitizeListAuditLogs, sanitizeSendNotification,
    sanitizeSearchUsers,
    sanitizeBulkIds, sanitizeBulkAssignTeacher,
} from '../input_sanitizers/admin.input.sanitizer.js';

const router = Router();

// All routes require valid JWT + admin role
router.use(authenticate, requireRole('admin'));

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/stats',                               asyncHandler(getDashboardStats));

// ── Users — static & bulk routes FIRST (before /:id) ─────────────────────────
// IMPORTANT: /users/search, /users/email/*, /users/bulk/* must all come before
// /users/:id — otherwise Express matches the literal strings as the :id param.
router.get   ('/users',                            asyncHandler(listUsers));
router.get   ('/users/search',                     sanitizeSearchUsers,       asyncHandler(searchUsers));
router.get   ('/users/email/:email',               asyncHandler(getUserByEmail));

// Bulk operations — DELETE and PATCH with /bulk prefix
router.delete('/users/bulk',                       sanitizeBulkIds,           asyncHandler(bulkDeleteUsers));
router.patch ('/users/bulk/suspend',               sanitizeBulkIds,           asyncHandler(bulkSuspendUsers));
router.patch ('/users/bulk/assign-teacher',        sanitizeBulkAssignTeacher, asyncHandler(bulkAssignTeacher));

// ── Users — dynamic /:id routes AFTER static routes ──────────────────────────
router.get   ('/users/:id/activity',               asyncHandler(getUserActivity));
router.patch ('/users/:id/promote',                asyncHandler(promoteUser));
router.patch ('/users/:id/assign-teacher',         asyncHandler(assignTeacher));
router.patch ('/users/:id/link-teacher',           asyncHandler(linkStudentToTeacher));
router.patch ('/users/:id/unlink-teacher',         asyncHandler(unlinkStudentFromTeacher));
router.patch ('/users/:id/suspend',                asyncHandler(suspendUser));
router.patch ('/users/:id/reactivate',             asyncHandler(reactivateUser));
router.patch ('/users/:id/demote',                 asyncHandler(demoteUser));
router.post  ('/users/:id/force-password-reset',   asyncHandler(forcePasswordReset));
router.delete('/users/:id',                        asyncHandler(deleteUser));

// ── Teachers ──────────────────────────────────────────────────────────────────
router.get('/teachers/workloads',                  asyncHandler(getTeacherWorkloads));

// ── Writing Tasks — static routes before /:id ────────────────────────────────
router.get   ('/writing-tasks',                    asyncHandler(listTasks));
router.get   ('/writing-tasks/search',             asyncHandler(searchTasks));
router.post  ('/writing-tasks/transfer',           sanitizeTransferTasks, asyncHandler(transferTasks));
router.patch ('/writing-tasks/:id/review',         sanitizeReviewTask,    asyncHandler(reviewTask));
router.patch ('/writing-tasks/:id/score',          sanitizeScoreTask,     asyncHandler(scoreTask));

// ── Content moderation ────────────────────────────────────────────────────────
router.get   ('/flags',                            asyncHandler(listFlags));
router.post  ('/flags',                            sanitizeFlagContent,   asyncHandler(flagContent));
router.post  ('/flags/:flagId/resolve',            sanitizeResolveFlag,   asyncHandler(resolveFlag));
router.delete('/content/:taskId',                  asyncHandler(deleteContent));

// ── Audit logs ────────────────────────────────────────────────────────────────
router.get('/audit-logs',                          sanitizeListAuditLogs, asyncHandler(listAuditLogs));

// ── Notifications ─────────────────────────────────────────────────────────────
router.post('/notifications',                      sanitizeSendNotification, asyncHandler(sendNotification));

export default router;