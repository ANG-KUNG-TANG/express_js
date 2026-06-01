import * as contentFlagService from '../../core/services/user_service.js';
import * as taskService from '../../core/services/task_service.js';
import logger from '../../core/logger/logger.js';

export const admFlagContentUC = async (adminId, taskId, reason, severity = 'medium') => {
    logger.debug('admFlagContentUC: initiating', { adminId, taskId, severity });

    // 1. Verify existence via Service (Handles Cache)
    const task = await taskService.getTaskById(taskId);

    // 2. Delegate creation to Service (Handles Repo + Audit)
    return await contentFlagService.createFlag(adminId, {
        taskId,
        taskTitle: task.title,
        reason,
        severity,
    });
};


