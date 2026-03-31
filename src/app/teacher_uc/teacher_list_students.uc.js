// src/app/teacher_uc/teacher_list_students.uc.js

import * as userRepo            from '../../infrastructure/repositories/user_repo.js';
import { findByAssignedBy }     from '../../infrastructure/repositories/task_repo.js';
import { WritingStatus, AssignmentStatus } from '../../domain/base/task_enums.js';
import { redisGet, redisSet, redisDel, CacheKeys, TTL } from '../../core/services/redis.service.js';
import logger                   from '../../core/logger/logger.js';

export const teacherListStudentsUC = async (teacher, { includeTaskStats = false } = {}) => {
    const teacherId = String(teacher.id ?? teacher._id);

    // ── Cache (no-stats path only — stats are live by design) ────────────────
    // Key mirrors the pattern used in teacher_list_tasks.uc.js so adm_link_student.uc.js
    // can bust both with a single CacheKeys.teacherStudentList(teacherId) call.
    const cacheKey = CacheKeys.teacherStudentList
        ? CacheKeys.teacherStudentList(teacherId)
        : `teacher:${teacherId}:students`;

    if (!includeTaskStats) {
        const cached = await redisGet(cacheKey);
        if (cached) {
            logger.debug('teacherListStudentsUC: cache hit', { teacherId });
            return cached;
        }
    }

    // ── DB fetch ──────────────────────────────────────────────────────────────
    // Query by assignedTeacher only — don't filter by role here.
    // findStudentsByTeacher() filters by UserRole.STUDENT which may not match
    // all linked users (some may have role 'user'). We filter out teachers/admins
    // ourselves so every linked non-staff user is included.
    const allLinked = await userRepo.findAll({ assignedTeacher: teacherId });

    const students = allLinked.filter(s => {
        const role = s._role ?? s.role ?? '';
        return role !== 'teacher' && role !== 'admin';
    });

    // ── No stats path — cache and return ─────────────────────────────────────
    if (!includeTaskStats) {
        const plain = students.map(s => userRepo.sanitizeUser(s));
        await redisSet(cacheKey, plain, TTL.TASK_LIST ?? 60);
        logger.debug('teacherListStudentsUC: cache miss, stored', { count: plain.length });
        return plain;
    }

    // ── Stats path — always live, never cached ────────────────────────────────
    const enriched = await Promise.all(
        students.map(async (student) => {
            // BUG WAS HERE: student is a domain entity — use .id getter, not ._id
            const studentId = student.id ?? student._id;

            const tasks = await findByAssignedBy(teacherId, { assignedTo: studentId });

            const stats = {
                total:     tasks.length,
                assigned:  tasks.filter(t => t._status === WritingStatus.ASSIGNED).length,
                writing:   tasks.filter(t => t._status === WritingStatus.WRITING).length,
                submitted: tasks.filter(t => t._status === WritingStatus.SUBMITTED).length,
                reviewed:  tasks.filter(t => t._status === WritingStatus.REVIEWED).length,
                scored:    tasks.filter(t => t._status === WritingStatus.SCORED).length,
                declined:  tasks.filter(t => t._assignmentStatus === AssignmentStatus.DECLINED).length,
                pending:   tasks.filter(t => t._assignmentStatus === AssignmentStatus.PENDING_ACCEPTANCE).length,
            };

            const plain = userRepo.sanitizeUser(student);
            return { ...plain, taskStats: stats };
        })
    );

    return enriched;
};