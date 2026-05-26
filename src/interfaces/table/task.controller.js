// src/interfaces/controllers/task.controller.js

import { createWritingTask }    from '../../app/task_uc/create_task.uc.js';
import { getWritingTaskById }   from '../../app/task_uc/get_task.uc.js';
import { listWritingTasks }     from '../../app/task_uc/list_task.uc.js';
import { searchWritingTasks }   from '../../app/task_uc/search_task.uc.js';
import { updateWritingTask }    from '../../app/task_uc/update_task.uc.js';
import { deleteWritingTask }    from '../../app/task_uc/delete_task.uc.js';
import { transferWritingTasks } from '../../app/task_uc/transfer_task.uc.js';
import { startWritingTask }     from '../../app/task_uc/start_task.uc.js';
import { submitTask }           from '../../app/task_uc/complete_task.uc.js';
import { reviewTask }           from '../../app/task_uc/review_task.uc.js';
import { scoreTask }            from '../../app/task_uc/score_task.uc.js';
import { lookupVocabUseCase }   from '../../app/task_uc/lookup_vocab.uc.js';
import { respondAssignmentUC }  from '../../app/task_uc/respond_assignment.uc.js';
import { evaluateWritingUC }    from '../../app/task_uc/evaluate_writing.uc.js';
import { sendSuccess }          from '../response_formatter.js';
import { HTTP_STATUS }          from '../http_status.js';
import { sanitizeCreateInput, sanitizeUpdateInput } from '../input_sanitizers/task.input_sanitizer.js';
import { recordAudit }          from '../../core/services/audit.service.js';
import { AuditAction }          from '../../domain/base/audit_enums.js';
import { AppError }             from '../../core/errors/base.errors.js';
import logger                   from '../../core/logger/logger.js';

const getUserId = (req) => req.user?.id ?? req.user?._id;

// ── Redis rate-limit constant ─────────────────────────────────────────────────
const AI_CHECK_DAILY_LIMIT = 5;

// POST /writing-tasks
export const createWritingTaskController = async (req, res) => {
    const userId = getUserId(req);
    const data   = sanitizeCreateInput(req.body);
    logger.debug('writingTask.create called', { requestId: req.id, userId });
    const task = await createWritingTask(userId, data);
    recordAudit(AuditAction.TASK_CREATED, userId, { taskId: task.id }, req);
    return sendSuccess(res, task, HTTP_STATUS.CREATED);
};

// GET /writing-tasks/:id
export const getWritingTaskByIdController = async (req, res) => {
    const { id } = req.params;
    const userId  = getUserId(req);
    const isAdmin = req.user?.role === 'admin';
    logger.debug('writingTask.getById called', { requestId: req.id, taskId: id, userId });
    const task = await getWritingTaskById(id, isAdmin ? null : userId);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

// GET /writing-tasks
export const listWritingTaskController = async (req, res) => {
    const { status, taskType, examType, page, limit, sortBy, sortOrder } = req.query;
    const userId  = getUserId(req);
    const filters = {};
    if (status)   filters.status   = status;
    if (taskType) filters.taskType = taskType;
    if (examType) filters.examType = examType;
    const options = { page, limit, sortBy, sortOrder };
    logger.debug('writingTask.list called', { requestId: req.id, userId, filters });
    const tasks = await listWritingTasks(filters, options, userId);
    return sendSuccess(res, tasks, HTTP_STATUS.OK);
};

// GET /writing-tasks/search?q=
export const searchWritingTaskController = async (req, res) => {
    const { q, page, limit, sortBy, sortOrder } = req.query;
    const userId  = getUserId(req);
    const options = { page, limit, sortBy, sortOrder };
    logger.debug('writingTask.search called', { requestId: req.id, userId, query: q });
    const tasks = await searchWritingTasks(q, options, userId);
    return sendSuccess(res, tasks, HTTP_STATUS.OK);
};

// PATCH /writing-tasks/:id
export const updateWritingTaskController = async (req, res) => {
    const { id }  = req.params;
    const userId  = getUserId(req);
    const updates = sanitizeUpdateInput(req.body);
    logger.debug('writingTask.update called', { requestId: req.id, taskId: id, userId });
    const task = await updateWritingTask(id, updates, userId);
    recordAudit(AuditAction.TASK_UPDATED, userId, { taskId: id, updatedFields: Object.keys(updates) }, req);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

// DELETE /writing-tasks/:id
// audit handled inside deleteWritingTask UC
export const deleteWritingTaskController = async (req, res) => {
    const { id } = req.params;
    const userId  = getUserId(req);
    logger.debug('writingTask.delete called', { requestId: req.id, taskId: id, userId });
    const result = await deleteWritingTask(id, userId, req);
    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// PATCH /writing-tasks/:id/start
export const startWritingTaskController = async (req, res) => {
    const { id } = req.params;
    const userId  = getUserId(req);
    logger.debug('writingTask.start called', { requestId: req.id, taskId: id, userId });
    const task = await startWritingTask(id, userId);
    recordAudit(AuditAction.TASK_STARTED, userId, { taskId: id }, req);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

// PATCH /writing-tasks/:id/submit
// audit handled inside submitTask UC
export const submitTaskController = async (req, res) => {
    const { id }             = req.params;
    const userId             = getUserId(req);
    const { submissionText } = req.body;
    logger.debug('writingTask.submit called', { requestId: req.id, taskId: id, userId });
    const task = await submitTask(id, userId, submissionText, req);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

// PATCH /writing-tasks/:id/review
// audit handled inside reviewTask UC
export const reviewTaskController = async (req, res) => {
    const { id }       = req.params;
    const reviewerId   = getUserId(req);
    const { feedback } = req.body;
    logger.debug('writingTask.review called', { requestId: req.id, taskId: id, reviewerId });
    const task = await reviewTask(id, reviewerId, feedback, req);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

// PATCH /writing-tasks/:id/score
export const scoreTaskController = async (req, res) => {
    const { id }        = req.params;
    const scorerId      = getUserId(req);
    const { bandScore } = req.body;
    logger.debug('writingTask.score called', { requestId: req.id, taskId: id, scorerId });
    const task = await scoreTask(id, scorerId, bandScore);
    recordAudit(AuditAction.TASK_SCORED_USER, scorerId, { taskId: id, bandScore: task._bandScore }, req);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

// GET /vocab/:word
export const lookupVocabController = async (req, res) => {
    const { word } = req.params;
    logger.debug('vocab.lookup called', { requestId: req.id, word });
    const result = await lookupVocabUseCase({ word });
    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// POST /writing-tasks/transfer
export const transferWritingTaskController = async (req, res, next) => {
    try {
        const { fromUserId, toUserId } = req.body;
        logger.debug('writingTask.transfer called', { requestId: req.id, fromUserId, toUserId });
        const result = await transferWritingTasks(fromUserId, toUserId);
        recordAudit(AuditAction.TASK_TRANSFERRED, req.user?.id ?? null, {
            fromUserId,
            toUserId,
            transferredCount: result.transferred,
        }, req);
        return sendSuccess(res, result, HTTP_STATUS.OK);
    } catch (err) {
        next(err);
    }
};

// POST /writing-tasks/:taskId/respond-assignment
// audit handled inside respondAssignmentUC
export const respondAssignmentController = async (req, res) => {
    const student                   = req.user;
    const { taskId }                = req.params;
    const { action, declineReason } = req.body;
    logger.debug('writingTask.respondAssignment called', { requestId: req.id, taskId, action, userId: student.id });
    const task = await respondAssignmentUC(student, { taskId, action, declineReason }, req);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

// POST /writing-tasks/:id/ai-check
//
// Rate-limited: AI_CHECK_DAILY_LIMIT checks per user per UTC day (via Redis).
// Returns cached aiEvaluation if it already exists on the task.
// Teacher's bandScore and feedback are never modified.
export const aiCheckTaskController = async (req, res, next) => {
    try {
        const { id }   = req.params;
        const userId   = getUserId(req);

        logger.debug('writingTask.aiCheck called', { requestId: req.id, taskId: id, userId });

        // ── Redis rate limit ──────────────────────────────────────────────────
        const today        = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
        const rateLimitKey = `ai_check:${userId}:${today}`;
        const redis        = req.app.locals.redis;

        const count = await redis.incr(rateLimitKey);
        if (count === 1) {
            // First hit today — expire at end of day (86400s)
            await redis.expire(rateLimitKey, 86400);
        }
        if (count > AI_CHECK_DAILY_LIMIT) {
            throw new AppError(
                `AI evaluation limit reached (${AI_CHECK_DAILY_LIMIT}/day). Try again tomorrow.`,
                429
            );
        }

        // ── run use case ──────────────────────────────────────────────────────
        const task = await evaluateWritingUC(id, userId);

        // ── audit (fire-and-forget) ───────────────────────────────────────────
        recordAudit(
            AuditAction.TASK_AI_EVALUATED,
            userId,
            { taskId: id, bandScore: task._aiEvaluation?.bandScore },
            req
        );

        return sendSuccess(res, task, HTTP_STATUS.OK);
    } catch (err) {
        next(err);
    }
};