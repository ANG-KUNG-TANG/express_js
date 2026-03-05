import { createWritingTask }   from '../../app/task_uc/create_task.uc.js';
import { getWritingTaskById }  from '../../app/task_uc/get_task.uc.js';
import { listWritingTasks }    from '../../app/task_uc/list_task.uc.js';
import { searchWritingTasks }  from '../../app/task_uc/search_task.uc.js';
import { updateWritingTask }   from '../../app/task_uc/update_task.uc.js';
import { deleteWritingTask }   from '../../app/task_uc/delete_task.uc.js';
import { transferWritingTasks } from '../../app/task_uc/transfer_task.uc.js';
import { startWritingTask }    from '../../app/task_uc/start_task.uc.js';
import { submitTask }          from '../../app/task_uc/complete_task.uc.js';
import { reviewTask }          from '../../app/task_uc/review_task.uc.js';
import { scoreTask }           from '../../app/task_uc/score_task.uc.js';
import { lookupVocabUseCase }  from '../../app/task_uc/lookup_vocab.uc.js';
import { sendSuccess }           from '../response_formatter.js';
import { HTTP_STATUS }           from '../http_status.js';
import { sanitizeCreateInput, sanitizeUpdateInput } from './task.input_sanitizer.js';
import logger      from '../../core/logger/logger.js';
import auditLogger from '../../core/logger/audit.logger.js';
import { getUser } from '../../public/js/core/auth.js';


const getUserId = (req) => req.user?.id ?? req.user?._id;

// POST /writing-tasks
export const createWritingTaskController = async (req, res) => {
    const userId = getUserId(req);
    const data = sanitizeCreateInput(req.body);
    logger.debug('WritingTask.create called', {requestId: req.id, userId});
    const task =await createWritingTask(userId, data);
    auditLogger.log("WritingTask.created", { taskId: task.id, userId}, req);
    return sendSuccess(res, task, HTTP_STATUS.CREATED);
};

// GET /writing-tasks/:id
export const getWritingTaskByIdController = async (req, res) => {
    const { id } = req.params;
    const userId = getUserId(req);
    const isAdmin = req.user?.role === 'admin';
    logger.debug('writingTask.getById called', { requestId: req.id, taskId: id, userId });
    const task = await getWritingTaskById(id, isAdmin ? null : userId);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

// GET /writing-tasks
export const listWritingTaskController = async (req, res) => {
    const { status, taskType, examType, page, limit, sortBy, sortOrder } = req.query;
    const userId = getUserId(req);
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
    const { id } = req.params;
    const userId  = getUserId(req);
    const updates = sanitizeUpdateInput(req.body);
    logger.debug('writingTask.update called', { requestId: req.id, taskId: id, userId });
    const task = await updateWritingTask(id, updates, userId);
    auditLogger.log('writingTask.updated', { taskId: id, userId, updatedFields: Object.keys(updates) }, req);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

// DELETE /writing-tasks/:id
export const deleteWritingTaskController = async (req, res) => {
    const { id } = req.params;
    const userId  = getUserId(req);
    logger.debug('writingTask.delete called', { requestId: req.id, taskId: id, userId });
    const result = await deleteWritingTask(id, userId);
    auditLogger.log('writingTask.deleted', { taskId: id, userId }, req);
    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// PATCH /writing-tasks/:id/start
export const startWritingTaskController = async (req, res) => {
    const { id } = req.params;
    const userId = getUserId(req);
    logger.debug("WritingTask.start called", { requestId: req.id, taskId: id, userId});
    const task = await startWritingTask(id, userId);
    auditLogger.log('writingTask.started', { taskId: id, userId}, req);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

// PATCH /writing-tasks/:id/submit
export const submitTaskController = async (req, res) => {
    const { id }             = req.params;
    const userId             = getUserId(req);
    const { submissionText } = req.body;
    logger.debug('writingTask.submit called', { requestId: req.id, taskId: id, userId });
    const task = await submitTask(id, userId, submissionText);
    auditLogger.log('writingTask.submitted', { taskId: id, userId, wordCount: task._wordCount }, req);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

// PATCH /writing-tasks/:id/review
export const reviewTaskController = async (req, res) => {
    const { id }       = req.params;
    const reviewerId   = getUserId(req);
    const { feedback } = req.body;
    logger.debug('writingTask.review called', { requestId: req.id, taskId: id, reviewerId });
    const task = await reviewTask(id, reviewerId, feedback);
    auditLogger.log('writingTask.reviewed', { taskId: id, reviewerId }, req);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

// PATCH /writing-tasks/:id/score
export const scoreTaskController = async (req, res) => {
    const { id }        = req.params;
    const scorerId      = getUserId(req);
    const { bandScore } = req.body;
    logger.debug('writingTask.score called', { requestId: req.id, taskId: id, scorerId });
    const task = await scoreTask(id, scorerId, bandScore);
    auditLogger.log('writingTask.scored', { taskId: id, scorerId, bandScore: task._bandScore }, req);
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
        auditLogger.log('writingTask.transferred', {
            fromUserId,
            toUserId,
            transferredCount: result.transferred,
            requesterId: req.user?.id ?? null,
        }, req);
        return sendSuccess(res, result, HTTP_STATUS.OK);
    } catch (err) {
        next(err);
    }
};