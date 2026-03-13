import { getDashboardStatsUC }   from '../../app/admin/stats.uc.js';
import { adminListUsersUC }      from '../../app/admin/adm_list_user.uc.js';
import { adminGetUserByEmailUC } from '../../app/admin/adm_getby_mail.uc.js';
import { adminPromoteUserUC }    from '../../app/admin/adm_promote_user.uc.js';
import { adminAssignTeacherUC }  from '../../app/admin/assign_teacher.uc.js';
import { adminDeleteUserUC }     from '../../app/admin/adm_delete_user.uc.js';
import { adminListTasksUC }      from '../../app/admin/adm_list_task.uc.js';
import { adminSearchTasksUC }    from '../../app/admin/adm_search_task.uc.js';
import { adminReviewTaskUC }     from '../../app/admin/adm_review_task.uc.js';
import { adminScoreTaskUC }      from '../../app/admin/adm_score_task.uc.js';
import { adminTransferTasksUC }  from '../../app/admin/adm_transfer_tasks.uc.js';
import { sendSuccess }           from '../response_formatter.js';
import { HTTP_STATUS }           from '../http_status.js';
import auditLogger               from '../../core/logger/audit.logger.js';

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
    const user = await adminPromoteUserUC(req.params.id);
    auditLogger.log('admin.user.promoted', { targetUserId: req.params.id, requesterId: req.user?.id }, req);
    return sendSuccess(res, user, HTTP_STATUS.OK);
};

export const assignTeacher = async (req, res) => {
    const user = await adminAssignTeacherUC(req.params.id);
    auditLogger.log('admin.user.assigned_teacher', { targetUserId: req.params.id, requesterId: req.user?.id }, req);
    return sendSuccess(res, user, HTTP_STATUS.OK);
};

export const deleteUser = async (req, res) => {
    const result = await adminDeleteUserUC(req.params.id);
    auditLogger.log('admin.user.deleted', { targetUserId: req.params.id, requesterId: req.user?.id }, req);
    return sendSuccess(res, result, HTTP_STATUS.OK);
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
    auditLogger.log('admin.task.reviewed', { taskId: req.params.id, requesterId: req.user?.id }, req);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

export const scoreTask = async (req, res) => {
    const task = await adminScoreTaskUC(req.params.id, { bandScore: req.body.bandScore });
    auditLogger.log('admin.task.scored', { taskId: req.params.id, bandScore: req.body.bandScore, requesterId: req.user?.id }, req);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

export const transferTasks = async (req, res) => {
    const { fromUserId, toUserId } = req.body;
    const result = await adminTransferTasksUC({ fromUserId, toUserId });
    auditLogger.log('admin.tasks.transferred', { fromUserId, toUserId, ...result, requesterId: req.user?.id }, req);
    return sendSuccess(res, result, HTTP_STATUS.OK);
};