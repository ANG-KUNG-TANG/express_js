// src/core/services/teacher_service.js

import * as taskRepo   from '../../infrastructure/repositories/task_repo.js';
import * as userRepo   from '../../infrastructure/repositories/user_repo.js';
import { toResponseDTO } from '../../infrastructure/mapper/user.mapper.js'; // fix: was sanitizeUser
import {
    redisGet, redisSet, redisDel,
    CacheKeys, TTL,
} from '../../core/services/redis.service.js';
import logger from '../../core/logger/logger.js';

// ── Profile ───────────────────────────────────────────────────────────────────

export const getTeacherProfile = async (teacherId) => {
    const cached = await redisGet(CacheKeys.userDetail(teacherId));
    if (cached) return cached;

    const user = await userRepo.findUserById(teacherId);
    const dto  = toResponseDTO(user);
    await redisSet(CacheKeys.userDetail(teacherId), dto, TTL.USER_PROFILE);
    return dto;
};

export const updateTeacherProfile = async (teacherId, fields) => {
    const updated = await userRepo.updateProfileInfo(teacherId, fields);
    await redisDel(CacheKeys.userDetail(teacherId));
    return toResponseDTO(updated);
};

export const getTeacherDashboardStats = async (teacherId) => {
    return await userRepo.getTeacherDashboardStats(teacherId);
};

// ── Students ──────────────────────────────────────────────────────────────────

export const listStudents = async (teacherId) => {
    const cacheKey = CacheKeys.teacherTaskList(teacherId) + ':students';

    const cached = await redisGet(cacheKey);
    if (cached) {
        logger.debug('teacherService.listStudents: cache hit', { teacherId });
        return cached;
    }

    const allLinked = await userRepo.findAll({ assignedTeacher: teacherId });
    const students  = allLinked.filter((s) => s.role !== 'teacher' && s.role !== 'admin');
    const plain     = students.map(toResponseDTO); // fix: was sanitizeUser

    await redisSet(cacheKey, plain, TTL.TASK_LIST);
    logger.debug('teacherService.listStudents: cache miss, stored', { count: plain.length });
    return plain;
};

export const listStudentsWithStats = async (teacherId) => {
    // Always live — never cached (stats must be fresh)
    const allLinked = await userRepo.findAll({ assignedTeacher: teacherId });
    const students  = allLinked.filter((s) => s.role !== 'teacher' && s.role !== 'admin');

    return await Promise.all(
        students.map(async (student) => {
            const tasks = await taskRepo.findByAssignedTo(student.id, {}, {});
            return {
                ...toResponseDTO(student), // fix: was sanitizeUser
                taskStats: {
                    total:     tasks.length,
                    assigned:  tasks.filter((t) => t.status === 'ASSIGNED').length,
                    writing:   tasks.filter((t) => t.status === 'WRITING').length,
                    submitted: tasks.filter((t) => t.status === 'SUBMITTED').length,
                    reviewed:  tasks.filter((t) => t.status === 'REVIEWED').length,
                    scored:    tasks.filter((t) => t.status === 'SCORED').length,
                    declined:  tasks.filter((t) => t.assignmentStatus === 'DECLINED').length,
                    pending:   tasks.filter((t) => t.assignmentStatus === 'PENDING_ACCEPTANCE').length,
                },
            };
        })
    );
};

export const getStudent = async (teacherId, studentId) => {
    return await userRepo.findStudentByIdForTeacher(teacherId, studentId);
};

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const listAssignedTasks = async (teacherId, filter = {}, options = {}) => {
    const { page = 1, limit = 20, status } = options;
    const cacheKey = `${CacheKeys.teacherTaskList(teacherId)}:${status ?? 'all'}:p${page}:l${limit}`;

    const cached = await redisGet(cacheKey);
    if (cached) {
        logger.debug('teacherService.listAssignedTasks: cache hit', { teacherId });
        return cached;
    }

    const tasks = await taskRepo.findByAssignedBy(teacherId, filter, { page, limit });
    await redisSet(cacheKey, tasks, TTL.TASK_LIST);
    logger.debug('teacherService.listAssignedTasks: cache miss, stored', { count: tasks.length });
    return tasks;
};

export const getTask = async (taskId) => {
    return await taskRepo.findTaskByID(taskId);
};

export const searchTasks = async (teacherId, q) => {
    const filter = q?.trim()
        ? { title: { $regex: q.trim(), $options: 'i' } }
        : {};
    return await taskRepo.findByAssignedBy(teacherId, filter);
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

export const createTask = async (taskData) => {
    return await taskRepo.createTask(taskData);
};

export const createManyTasks = async (payloads) => {
    return await taskRepo.createManyTasks(payloads);
};

// fix: findById and findOneByTopic didn't exist — use correct repo methods
export const findTaskById = async (taskId) => {
    return await taskRepo.findTaskByID(taskId);
};

export const findTaskByTitle = async (title) => {
    const results = await taskRepo.searchTasksByTitle(title, { limit: 1 });
    return results[0] ?? null; // fix: replaces non-existent findOneByTopic
};