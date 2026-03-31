// src/interfaces/controllers/admin.controller.js
import { getDashboardStatsUC }             from '../../app/admin/stats.uc.js';
import { adminListUsersUC }                from '../../app/admin/adm_list_user.uc.js';
import { adminGetUserByEmailUC }           from '../../app/admin/adm_getby_mail.uc.js';
import { adminPromoteUserUC }              from '../../app/admin/adm_promote_user.uc.js';
import { adminAssignTeacherUC }            from '../../app/admin/assign_teacher.uc.js';
import { adminDeleteUserUC }               from '../../app/admin/adm_delete_user.uc.js';
import { adminListTasksUC }                from '../../app/admin/adm_list_task.uc.js';
import { adminSearchTasksUC }              from '../../app/admin/adm_search_task.uc.js';
import { adminReviewTaskUC }               from '../../app/admin/adm_review_task.uc.js';
import { adminScoreTaskUC }                from '../../app/admin/adm_score_task.uc.js';
import { adminTransferTasksUC }            from '../../app/admin/adm_transfer_tasks.uc.js';
import {
    adminLinkStudentToTeacherUC,
    adminUnlinkStudentFromTeacherUC,
} from '../../app/admin/adm_link_student.uc.js';
import { admFlagContentUC }               from '../../app/admin/adm_flag_content.uc.js';
import { admResolveFlagUC }               from '../../app/admin/adm_resolve_flag.uc.js';
import { admListFlagsUC }                 from '../../app/admin/adm_list_flags.uc.js';
import { admDeleteContentUC }             from '../../app/admin/adm_delete_content.uc.js';
import { admListAuditLogsUC }             from '../../app/admin/adm_list_audit_logs.uc.js';
import { admSendNotificationUC}           from '../../app/admin/adm_send_noti.uc.js';
import { sendSuccess }                     from '../response_formatter.js';
import { HTTP_STATUS }                     from '../http_status.js';
import auditLogger                         from '../../core/logger/audit.logger.js';
import { AuditAction }                     from '../../domain/base/audit_enums.js';

// ── Dashboard ──────────────────────────────────────────────────────────────
export const getDashboardStats = async (req, res) => {
    const stats = await getDashboardStatsUC();
    return sendSuccess(res, stats, HTTP_STATUS.OK);
};

// ── Users ──────────────────────────────────────────────────────────────────
export const listUsers = async (req, res) => {
    const users = await adminListUsersUC();
    return sendSuccess(res, users, HTTP_STATUS.OK);
};

export const getUserByEmail = async (req, res) => {
    const user = await adminGetUserByEmailUC(decodeURIComponent(req.params.email));
    return sendSuccess(res, user, HTTP_STATUS.OK);
};

export const promoteUser = async (req, res) => {
    const user = await adminPromoteUserUC(req.user.id, req.params.id);
    auditLogger.log(AuditAction.USER_PROMOTED, { targetUserId: req.params.id }, req);
    return sendSuccess(res, user, HTTP_STATUS.OK);
};

export const assignTeacher = async (req, res) => {
    const user = await adminAssignTeacherUC(req.params.id);
    auditLogger.log(AuditAction.USER_ASSIGNED_TEACHER, { targetUserId: req.params.id }, req);
    return sendSuccess(res, user, HTTP_STATUS.OK);
};

export const deleteUser = async (req, res) => {
    const result = await adminDeleteUserUC(req.params.id);
    auditLogger.log(AuditAction.USER_DELETED, { targetUserId: req.params.id }, req);
    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// PATCH /admin/users/:id/link-teacher   body: { teacherId }
export const linkStudentToTeacher = async (req, res) => {
    const { id: studentId } = req.params;
    const { teacherId }     = req.body;
    const user = await adminLinkStudentToTeacherUC(req.user.id, studentId, teacherId);
    auditLogger.log(AuditAction.USER_LINKED_TO_TEACHER, { studentId, teacherId }, req);
    return sendSuccess(res, user, HTTP_STATUS.OK);
};

// PATCH /admin/users/:id/unlink-teacher
export const unlinkStudentFromTeacher = async (req, res) => {
    const { id: studentId } = req.params;
    const user = await adminUnlinkStudentFromTeacherUC(req.user.id, studentId);
    auditLogger.log(AuditAction.USER_UNLINKED_FROM_TEACHER, { studentId }, req);
    return sendSuccess(res, user, HTTP_STATUS.OK);
};

// ── Tasks ──────────────────────────────────────────────────────────────────
export const listTasks = async (req, res) => {
    const { status, page, limit } = req.query;
    const tasks = await adminListTasksUC({ status, page, limit });
    return sendSuccess(res, tasks, HTTP_STATUS.OK);
};

export const searchTasks = async (req, res) => {
    const { q, status } = req.query;
    const tasks = await adminSearchTasksUC({ q, status });
    return sendSuccess(res, tasks, HTTP_STATUS.OK);
};

export const reviewTask = async (req, res) => {
    const task = await adminReviewTaskUC(req.params.id, { feedback: req.body.feedback });
    auditLogger.log(AuditAction.TASK_REVIEWED, { taskId: req.params.id }, req);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

export const scoreTask = async (req, res) => {
    const task = await adminScoreTaskUC(req.params.id, { bandScore: req.body.bandScore });
    auditLogger.log(AuditAction.TASK_SCORED, { taskId: req.params.id, bandScore: req.body.bandScore }, req);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

export const transferTasks = async (req, res) => {
    const { fromUserId, toUserId } = req.body;
    const result = await adminTransferTasksUC({ fromUserId, toUserId });
    auditLogger.log(AuditAction.TASKS_TRANSFERRED, { fromUserId, toUserId, ...result }, req);
    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// ── Content moderation ─────────────────────────────────────────────────────

// GET /admin/flags?status=open&severity=high&page=1&limit=20
export const listFlags = async (req, res) => {
    const { status, severity, taskId, page, limit } = req.query;
    const result = await admListFlagsUC({ status, severity, taskId, page, limit });
    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// POST /admin/flags   body: { taskId, reason, severity }
export const flagContent = async (req, res) => {
    const { taskId, reason, severity } = req.body;
    const flag = await admFlagContentUC(req.user.id, taskId, reason, severity);
    auditLogger.log(AuditAction.CONTENT_FLAGGED, { taskId, severity }, req);
    return sendSuccess(res, flag, HTTP_STATUS.CREATED);
};

// POST /admin/flags/:flagId/resolve
export const resolveFlag = async (req, res) => {
    const flag = await admResolveFlagUC(req.user.id, req.params.flagId);
    auditLogger.log(AuditAction.CONTENT_FLAG_RESOLVED, { flagId: req.params.flagId }, req);
    return sendSuccess(res, flag, HTTP_STATUS.OK);
};

// DELETE /admin/content/:taskId
export const deleteContent = async (req, res) => {
    const result = await admDeleteContentUC(req.params.taskId);
    auditLogger.log(AuditAction.CONTENT_DELETED, { taskId: req.params.taskId }, req);
    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// ── Audit logs ─────────────────────────────────────────────────────────────

// GET /admin/audit-logs?action=&requesterId=&outcome=&from=&to=&page=&limit=
export const listAuditLogs = async (req, res) => {
    const { action, requesterId, outcome, from, to, page, limit } = req.query;
    const result = await admListAuditLogsUC({ action, requesterId, outcome, from, to, page, limit });
    return sendSuccess(res, result, HTTP_STATUS.OK);
};


export const listAuditActions = async (req, res) => {
    const { action, requesterId, outcome, from, to, page, limit } = req.query;
    const result = await admListAuditLogsUC({ action, requesterId, outcome, from, to, page, limit });
    return sendSuccess(res, result, HTTP_STATUS.OK);
}
// ── Notifications ──────────────────────────────────────────────────────────

// POST /admin/notifications
// body: { audience, targetUserId?, type, title, message, ctaText?, ctaUrl? }
export const sendNotification = async (req, res) => {
    const { audience, targetUserId, type, title, message, ctaText, ctaUrl } = req.body;
    const result = await admSendNotificationUC({
        audience,
        targetUserId,
        type,
        title,
        message,
        ctaText,
        ctaUrl,
        senderId: req.user.id,
    });
    auditLogger.log(AuditAction.NOTIFICATION_SENT, { audience, targetUserId, ...result }, req);
    return sendSuccess(res, result, HTTP_STATUS.CREATED);
};