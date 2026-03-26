// src/app/admin/adm_flag_content.uc.js
import { findTaskByID } from '../../infrastructure/repositories/task_repo.js';
import { createFlag }   from '../../infrastructure/repositories/content_flag_repo.js';
import logger           from '../../core/logger/logger.js';

/**
 * Admin flags a student submission.
 *
 * @param {string}                   adminId   — the admin's userId (from JWT)
 * @param {string}                   taskId    — task being flagged
 * @param {string}                   reason    — explanation
 * @param {'low'|'medium'|'high'}    severity
 * @returns {Promise<ContentFlag>}
 */
export const admFlagContentUC = async (adminId, taskId, reason, severity = 'medium') => {
    logger.debug('admFlagContentUC', { adminId, taskId, severity });

    // Verify the task exists before flagging it — throws TaskNotFoundError if missing
    const task = await findTaskByID(taskId);

    const flag = await createFlag({
        taskId,
        taskTitle: task.title ?? null,   // use public getter, not private _title
        flaggedBy: adminId,
        reason,
        severity,
    });

    logger.debug('admFlagContentUC: flag created', { flagId: flag.id });
    return flag;
};