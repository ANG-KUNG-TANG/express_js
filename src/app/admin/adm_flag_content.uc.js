import * as userService from '../../core/services/user_service.js';
import * as taskRepo from '../../infrastructure/repositories/task_repo.js';
import logger from '../../core/logger/logger.js';

export const admFlagContentUC = async (adminId, taskId, reason, severity = 'medium') => {
    logger.debug('admFlagContentUC: initiating', { adminId, taskId, severity });

    // 1. Verify task existence directly via repo (no separate task_service needed)
    await taskRepo.findTaskByID(taskId);

    // 2. Delegate flag creation to user_service (Handles Repo + Audit)
    return await userService.createFlag(adminId, {
        taskId,
        reason,
        severity,
    });
};