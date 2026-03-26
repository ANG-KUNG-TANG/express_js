// src/app/admin/adm_delete_content.uc.js
import { findTaskByID, updateTask } from '../../infrastructure/repositories/task_repo.js';
import { WritingStatus } from '../../domain/base/task_enums.js';
import logger from '../../core/logger/logger.js';

/**
 * Admin removes inappropriate student content.
 *
 * Soft-deletes by setting the task status to 'deleted'.
 * Admin CANNOT edit the submission — only remove it.
 *
 * @param {string} taskId  — task to remove
 * @returns {Promise<WritingTask>}
 */
export const admDeleteContentUC = async (taskId) => {
    logger.debug('admDeleteContentUC', { taskId });

    // Verify task exists first — throws TaskNotFoundError if not
    await findTaskByID(taskId);

    // Soft-delete: status → 'deleted'
    // updateTask is the existing repo function — reuse it, don't duplicate logic
    const updated = await updateTask(taskId, { status: WritingStatus.DELETED ?? 'deleted' });

    logger.debug('admDeleteContentUC: task soft-deleted', { taskId });
    return updated;
};