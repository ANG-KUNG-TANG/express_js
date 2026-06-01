// src/core/services/user_service.js
import * as auditLogRepo from '../../infrastructure/repositories/audit_log_repo.js';
import * as userRepo from '../../infrastructure/repositories/user_repo.js';
import * as taskRepo from '../../infrastructure/repositories/task_repo.js';
import { recordAudit } from '../../core/services/audit.service.js';
import { AuditAction } from '../../domain/base/audit_enums.js';
import { WritingStatus } from '../../domain/base/task_enums.js';
import { toResponseDTO } from '../../infrastructure/mapper/user.mapper.js'; // Bug 1 fix
import * as contentFlagRepo from '../../infrastructure/repositories/content_flag_repo.js';
import { NotificationService } from '../../core/services/notification.service.js';
import { redisGet, redisSet, redisDel, CacheKeys, TTL } from '../../core/services/redis.service.js'; // Bug 2 fix
import UserModel from '../../infrastructure/models/user_model.js';
import { UserRole } from '../../domain/base/user_enums.js';

// ── User management ───────────────────────────────────────────────────────────

export const promoteUser = async (adminId, targetUserId) => {
    const updated = await userRepo.promoteToAdmin(targetUserId);
    await recordAudit(AuditAction.USER_PROMOTED, adminId, { targetUserId });
    return updated;
};

export const demoteUser = async (targetId, requesterId) => {
    const result = await userRepo.demoteToStudent(targetId);
    await recordAudit(AuditAction.USER_DEMOTED, requesterId, { targetUserId: targetId });
    return result;
};

export const deleteUser = async (userId, requesterId) => {
    const result = await userRepo.deleteUser(userId);
    await recordAudit(AuditAction.USER_DELETED, requesterId, { targetUserId: userId });
    return result;
};

export const reactivateUser = async (targetId, requesterId) => {
    const result = await userRepo.reactivateUser(targetId);
    await recordAudit(AuditAction.USER_REACTIVATED, requesterId, { targetUserId: targetId });
    return result;
};

export const forcePasswordReset = async (targetId, requesterId) => {
    const result = await userRepo.setPasswordResetRequired(targetId);
    await recordAudit(AuditAction.USER_PASSWORD_RESET_FORCED, requesterId, { targetUserId: targetId });
    return result;
};

export const assignTeacherRole = async (userId, requesterId) => {
    const updated = await userRepo.updateUser(userId, (u) => u.promoteToTeacher());
    await redisDel(CacheKeys.userDetail(userId)); // Bug 2 fix
    await recordAudit(AuditAction.USER_ROLE_ASSIGNED, requesterId, {
        targetUserId: userId,
        newRole: 'teacher',
    });
    return toResponseDTO(updated); // Bug 1 fix
};

// Bug 3 fix: suspendUser — userRepo has deactivateUser, not suspendUser
export const suspendUser = async (targetId, requesterId) => {
    const result = await userRepo.deactivateUser(targetId);
    await recordAudit(AuditAction.USER_SUSPENDED, requesterId, { targetUserId: targetId });
    return result;
};

export const getUserByEmail = async (email) => {
    const user = await userRepo.findUserByEmail(email);
    return toResponseDTO(user); // Bug 1 fix
};

export const listAllUsers = async () => {
    const users = await userRepo.listAllUsers();
    return users.map(toResponseDTO); // Bug 1 fix
};

export const searchUsers = async (options) => {
    const result = await userRepo.searchUsers(options);
    return {
        ...result,
        data: result.data.map(toResponseDTO), // Bug 1 fix
    };
};

export const linkStudentToTeacher = async (adminId, studentId, teacherId) => {
    const student = await userRepo.findUserById(studentId);
    const oldTeacherId = student.assignedTeacher;

    const updated = await userRepo.updateUser(studentId, (u) => u.assignTeacher(teacherId));

    // Bug 2 + 5 fix: use CacheKeys instead of undefined studentListKey()
    await redisDel(CacheKeys.userDetail(studentId));
    if (oldTeacherId) await redisDel(CacheKeys.userDetail(oldTeacherId));

    await recordAudit(AuditAction.USER_LINKED_TO_TEACHER, adminId, { studentId, teacherId });
    NotificationService.send({
        recipientId: teacherId,
        actorId:     adminId,
        type:        NotificationService.TYPES.LINKED,
        title:       'Student assigned',
        message:     `Student ${studentId} assigned to you.`,
        refId:       studentId,
        refModel:    'User',
    });

    return toResponseDTO(updated); // Bug 1 fix
};

// ── Bulk operations ───────────────────────────────────────────────────────────

export const bulkDeactivate = async (adminId, userIds) => {
    const result = await userRepo.bulkDeactivateUsers(userIds);
    await recordAudit(AuditAction.USERS_DEACTIVATED, adminId, { count: userIds.length });
    return result;
};

export const bulkDeleteUsers = async (ids, requesterId) => {
    const result = await userRepo.bulkDeleteUsers(ids);
    await recordAudit(AuditAction.USERS_DELETED, requesterId, { count: ids.length });
    return result;
};

// Bug 3 fix: bulkSuspendUsers — no such repo method, use bulkDeactivateUsers
export const bulkSuspendUsers = async (ids, requesterId) => {
    const result = await userRepo.bulkDeactivateUsers(ids);
    await recordAudit(AuditAction.USERS_SUSPENDED, requesterId, { count: ids.length });
    return result;
};

export const bulkAssignTeacher = async (studentIds, teacherId, requesterId) => {
    const result = await userRepo.bulkAssignTeacher(studentIds, teacherId);
    await recordAudit(AuditAction.USER_BULK_ASSIGN_TEACHER, requesterId, {
        teacherId,
        studentCount:  studentIds.length,
        assignedCount: result.assigned,
    });
    return result;
};

// ── Task operations ───────────────────────────────────────────────────────────

export const deleteTask = async (taskId, requesterId) => {
    await taskRepo.findTaskByID(taskId);
    await taskRepo.deleteTask(taskId);
    await redisDel(CacheKeys.taskDetail(taskId)); // Bug 2 fix
    await recordAudit(AuditAction.TASK_DELETED, requesterId, { taskId });
    return { deleted: true, taskId };
};

// Bug 4 fix: pass a callback to updateTask, not a plain object
export const softDeleteTask = async (taskId, requesterId) => {
    await taskRepo.findTaskByID(taskId);
    const updated = await taskRepo.updateTask(taskId, (t) => t.softDelete?.() ?? t);
    await redisDel(CacheKeys.taskDetail(taskId)); // Bug 2 fix
    await recordAudit(AuditAction.TASK_DELETED, requesterId, { taskId, action: 'soft-delete' });
    return updated;
};

export const reviewTask = async (taskId, feedback, requesterId) => {
    const updatedTask = await taskRepo.reviewTask(taskId, feedback);
    await redisDel(CacheKeys.taskDetail(taskId)); // Bug 2 fix
    await recordAudit(AuditAction.TASK_REVIEWED, requesterId, { taskId });
    return updatedTask;
};

export const scoreTask = async (taskId, bandScore, requesterId) => {
    const updatedTask = await taskRepo.scoreTask(taskId, bandScore);
    await redisDel(CacheKeys.taskDetail(taskId)); // Bug 2 fix
    await recordAudit(AuditAction.TASK_SCORED, requesterId, { taskId, bandScore });
    return updatedTask;
};

export const transferTasks = async (fromUserId, toUserId, requesterId) => {
    const result = await taskRepo.transferTasks(fromUserId, toUserId);
    await recordAudit(AuditAction.TASKS_TRANSFERRED, requesterId, {
        fromUserId,
        toUserId,
        count: result.transferred, // Bug 7 fix: was result.modifiedCount
    });
    return result;
};

export const listTasksForAdmin = async (options = {}) => {
    const params = {
        ...options,
        page:  Math.max(1, Number(options.page) || 1),
        limit: Number(options.limit) || 50,
    };
    return await taskRepo.findTasks({}, params);
};

export const searchTasksForAdmin = async ({ q, status } = {}) => {
    if (q) {
        const tasks = await taskRepo.searchTasksByTitle(q);
        return status ? tasks.filter((t) => t.status === status) : tasks;
    }
    return await taskRepo.findTasks({ status });
};

// ── Stats & reporting ─────────────────────────────────────────────────────────

export const getDashboardStats = async (teacherId) => {
    return await userRepo.getTeacherDashboardStats(teacherId);
};

export const getTeacherWorkloads = async () => {
    return await userRepo.getTeacherWorkloads();
};

export const getUserActivitySummary = async (targetId) => {
    const cacheKey = `user:${targetId}:activity`;

    // Bug 2 + 8 fix: use redis.service helpers instead of raw redisClient
    const cached = await redisGet(cacheKey);
    if (cached) return cached;

    const activity = await userRepo.getUserActivitySummary(targetId);
    await redisSet(cacheKey, activity, TTL.USER_PROFILE);
    return activity;
};

// Bug 6 fix: findRecentTasks doesn't exist — use findTasks with limit
export const getAdminStats = async () => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [userAgg, allTasks, recentTasks] = await Promise.all([
        UserModel.aggregate([{
            $facet: {
                total:       [{ $count: 'n' }],
                admins:      [{ $match: { role: UserRole.ADMIN } },   { $count: 'n' }],
                teachers:    [{ $match: { role: UserRole.TEACHER } }, { $count: 'n' }],
                newThisWeek: [{ $match: { createdAt: { $gte: oneWeekAgo } } }, { $count: 'n' }],
            },
        }]),
        taskRepo.findTasks({}, {}),
        taskRepo.findTasks({}, { limit: 10, sort: { createdAt: -1 } }), // Bug 6 fix
    ]);

    return formatDashboardData(userAgg, allTasks, recentTasks);
};

const formatDashboardData = (ua, allTasks, recentTasks) => {
    const u = ua[0] ?? {};
    return {
        users: {
            total:       u.total?.[0]?.n       ?? 0,
            admins:      u.admins?.[0]?.n      ?? 0,
            teachers:    u.teachers?.[0]?.n    ?? 0,
            newThisWeek: u.newThisWeek?.[0]?.n ?? 0,
        },
        tasks: {
            total:  allTasks.length,
            recent: recentTasks,
        },
    };
};

// ── Flags & logs ──────────────────────────────────────────────────────────────

export const createFlag = async (adminId, flagData) => {
    const flag = await contentFlagRepo.createFlag(flagData);
    await recordAudit(AuditAction.CONTENT_FLAGGED, adminId, {
        taskId:   flagData.taskId,
        flagId:   flag.id,
        severity: flagData.severity,
    });
    return flag;
};

export const resolveFlag = async (flagId, adminId) => {
    const flag = await contentFlagRepo.resolveFlag(flagId, adminId);
    await recordAudit(AuditAction.CONTENT_FLAG_RESOLVED, adminId, { flagId });
    return flag;
};

export const listFlags = async (options = {}) => {
    const params = {
        ...options,
        page:  Number(options.page)  || 1,
        limit: Number(options.limit) || 20,
    };
    return await contentFlagRepo.findFlags(params);
};

export const listLogs = async (options) => {
    const params = {
        ...options,
        page:  Number(options.page)  || 1,
        limit: Number(options.limit) || 20,
    };
    return await auditLogRepo.findLogs(params);
};

// ── Notifications ─────────────────────────────────────────────────────────────

export const broadcastAdminNotification = async ({
    audience, targetUserId, type, title, message, ctaText, ctaUrl, senderId,
}) => {
    const userIds = await resolveAudience(audience, targetUserId);
    if (!userIds.length) return { sent: 0, failed: 0 };

    const results = await Promise.allSettled(
        userIds.map((userId) => NotificationService.send({
            recipientId: userId,
            actorId:     senderId,
            type,
            title,
            message,
            ctaText,
            ctaUrl,
            metadata: { sentBy: senderId, audience },
        }))
    );

    return {
        sent:   results.filter((r) => r.status === 'fulfilled').length,
        failed: results.filter((r) => r.status === 'rejected').length,
    };
};

const resolveAudience = async (audience, targetUserId) => {
    if (audience === 'single' && targetUserId) return [targetUserId];
    if (audience === 'all') {
        const users = await userRepo.listAllUsers();
        return users.map((u) => u.id);
    }
    if (audience === 'students') {
        const users = await userRepo.findAll({ role: UserRole.STUDENT });
        return users.map((u) => u.id);
    }
    if (audience === 'teachers') {
        const users = await userRepo.findAll({ role: UserRole.TEACHER });
        return users.map((u) => u.id);
    }
    return [];
};