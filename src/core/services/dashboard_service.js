// src/core/services/dashboard_service.js

import * as userRepo  from '../../infrastructure/repositories/user_repo.js';
import * as taskRepo  from '../../infrastructure/repositories/task_repo.js';
import * as auditRepo from '../../infrastructure/repositories/audit_log_repo.js';

export const getAdminStats = async () => {
    const [userStats, taskStats, recentActivity] = await Promise.all([
        getUsersByRole(),
        getTasksByStatus(),
        getRecentActivity(),
    ]);

    return { userStats, taskStats, recentActivity };
};

// ── Users by role ─────────────────────────────────────────────────────────────
const getUsersByRole = async () => {
    const users = await userRepo.findUsers({});
    return users.reduce((acc, user) => {
        const role = user.role ?? user._role ?? 'unknown';
        acc[role] = (acc[role] ?? 0) + 1;
        return acc;
    }, {});
};

// ── Tasks by status ───────────────────────────────────────────────────────────
const getTasksByStatus = async () => {
    const tasks = await taskRepo.findTasks({});
    return tasks.reduce((acc, task) => {
        const status = task.status ?? task._status ?? 'unknown';
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
    }, {});
};

// ── Recent activity (last 20 audit entries) ───────────────────────────────────
const getRecentActivity = async () => {
    return await auditRepo.findRecentAuditLogs({ limit: 20 });
};