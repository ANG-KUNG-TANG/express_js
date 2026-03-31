// src/app/teacher_uc/teacher_list_tasks.uc.js

import { findByAssignedBy }                         from '../../infrastructure/repositories/task_repo.js';
import { WritingStatus }                            from '../../domain/base/task_enums.js';
import { redisGet, redisSet, CacheKeys, TTL }       from '../../core/services/redis.service.js';
import logger                                       from '../../core/logger/logger.js';

export const teacherListTasksUC = async ({ teacherId, status, page, limit } = {}) => {
    logger.debug('teacherListTasksUC', { teacherId, status });

    // ── Build cache key ───────────────────────────────────────────────────────
    // Include status/page/limit so different filters never share the same cache entry
    const cacheKey = `${CacheKeys.teacherTaskList(teacherId)}:${status ?? 'all'}:p${page ?? 1}:l${limit ?? 20}`;

    // ── 1. Check cache ────────────────────────────────────────────────────────
    const cached = await redisGet(cacheKey);
    if (cached) {
        logger.debug('teacherListTasksUC: cache hit', { teacherId });
        return cached;
    }

    // ── 2. Cache miss — fetch from DB ─────────────────────────────────────────
    const filter = {};
    if (status && Object.values(WritingStatus).includes(status)) {
        filter.status = status;
    }

    const tasks = await findByAssignedBy(teacherId, filter, { page, limit });

    // ── 3. Store in cache ─────────────────────────────────────────────────────
    await redisSet(cacheKey, tasks, TTL.TASK_LIST);

    logger.debug('teacherListTasksUC: cache miss, stored', { count: tasks.length });
    return tasks;
};