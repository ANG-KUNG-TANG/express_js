import * as taskRepo from '../../infrastructure/repositories/task_repo.js';
import { redisGet, redisSet, redisDel, CacheKeys, TTL } from '../../core/services/redis.service.js';

// ── Reads ─────────────────────────────────────────────────────────────────────

export const getTaskById = async (id) => {
    const cached = await redisGet(CacheKeys.taskDetail(id));
    if (cached) return cached;

    const task = await taskRepo.findTaskByID(id);

    await redisSet(CacheKeys.taskDetail(id), task.toJSON(), TTL.TASK_DETAIL);
    return task;
};

export const findTaskByID   = (id)                       => getTaskById(id);
export const findTaskByUser = (userId, options)          => taskRepo.findTaskByUser(userId, options);
export const findTaskByStatus = (status, options)        => taskRepo.findTaskByStatus(status, options);
export const findTasksByType  = (taskType, options)      => taskRepo.findTasksByType(taskType, options);
export const findTasks        = (options)                => taskRepo.findTasks({}, options);
export const countTasks       = (filters)                => taskRepo.countTasks(filters);
export const searchTasksByTitle = (searchTerm, options)  => taskRepo.searchTasksByTitle(searchTerm, options);
export const findByAssignedBy   = (teacherId, filter, options) => taskRepo.findByAssignedBy(teacherId, filter, options);
export const findByAssignedTo   = (studentId, filter, options) => taskRepo.findByAssignedTo(studentId, filter, options);
export const getUserTaskStats   = (userId)               => taskRepo.getUserTaskStats(userId);
export const ensureTaskOwnership = (task, userId)        => taskRepo.ensureTaskOwnership(task, userId);
export const lookupVocab         = (word)                => taskRepo.lookupVocab(word);

// ── Cron helpers ──────────────────────────────────────────────────────────────

export const findDueSoon          = (withinHours) => taskRepo.findDueSoon(withinHours);
export const findUnstarted        = (afterDays)   => taskRepo.findUnstarted(afterDays);
export const markReminderSent     = (taskId)      => taskRepo.markReminderSent(taskId);
export const markUnstartedNotiSent = (taskId)     => taskRepo.markUnstartedNotiSent(taskId);

// ── Writes ────────────────────────────────────────────────────────────────────

export const createTask = async (taskData) => {
    return await taskRepo.createTask(taskData);
};

export const createWritingTask = createTask; // alias used by create_task.uc.js

export const createManyTasks = async (payloads) => {
    return await taskRepo.createManyTasks(payloads);
};

export const deleteTask = async (id) => {
    const result = await taskRepo.deleteTask(id);
    await redisDel(CacheKeys.taskDetail(id));
    return result;
};

export const startWritingTask = async (taskId) => {
    const updated = await taskRepo.startWritingTask(taskId);
    await redisDel(CacheKeys.taskDetail(taskId));
    return updated;
};

export const updateTaskDetails = async (id, title, description) => {
    const updated = await taskRepo.updateTask(id, (t) => t.updateDetails(title, description));
    await redisDel(CacheKeys.taskDetail(id));
    return updated;
};

export const submitTask = async (taskId, text) => {
    const updated = await taskRepo.submitTask(taskId, text);
    await redisDel(CacheKeys.taskDetail(taskId));
    return updated;
};

export const reviewTask = async (taskId, feedback) => {
    const updated = await taskRepo.reviewTask(taskId, feedback);
    await redisDel(CacheKeys.taskDetail(taskId));
    return updated;
};

export const scoreTask = async (taskId, bandScore) => {
    const updated = await taskRepo.scoreTask(taskId, bandScore);
    await redisDel(CacheKeys.taskDetail(taskId));
    return updated;
};

export const acceptAssignment = async (taskId) => {
    const updated = await taskRepo.acceptAssignment(taskId);
    await redisDel(CacheKeys.taskDetail(taskId));
    return updated;
};

export const declineAssignment = async (taskId, reason) => {
    const updated = await taskRepo.declineAssignment(taskId, reason);
    await redisDel(CacheKeys.taskDetail(taskId));
    return updated;
};

export const saveAiEvaluation = async (taskId, evaluation) => {
    const updated = await taskRepo.saveAiEvaluation(taskId, evaluation);
    await redisDel(CacheKeys.taskDetail(taskId));
    return updated;
};

export const updateTask = async (id, mutateFn) => {
    const updated = await taskRepo.updateTask(id, mutateFn);
    await redisDel(CacheKeys.taskDetail(id));
    return updated;
};

export const transferTasks = async (fromUserId, toUserId, session) => {
    return await taskRepo.transferTasks(fromUserId, toUserId, session);
};

export const transferSingleTask = async (taskId, fromUserId, toUserId, session) => {
    const updated = await taskRepo.transferSingleTask(taskId, fromUserId, toUserId, session);
    await redisDel(CacheKeys.taskDetail(taskId));
    return updated;
};