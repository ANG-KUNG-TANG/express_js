// src/app/admin/adm_delete_content.uc.js
import { findTaskByID, deleteTask } from '../../infrastructure/repositories/task_repo.js';
import logger from '../../core/logger/logger.js';

/**
 * Admin removes inappropriate student content.
 *
 * Hard-deletes the task document via the repo layer — admin-only action.
 * We don't soft-delete because WritingStatus has no DELETED value, and content
 * removed for policy violations should not remain queryable in any status.
 *
 * @param {string} taskId
 * @returns {Promise<{ deleted: true, taskId: string }>}
 */
export const admDeleteContentUC = async (taskId) => {
    logger.debug('admDeleteContentUC', { taskId });

    // Verify task exists first — throws TaskNotFoundError if not
    await findTaskByID(taskId);

    // Hard-delete through the repo — never reach into the model directly from a UC
    await deleteTask(taskId);

    logger.debug('admDeleteContentUC: task deleted', { taskId });
    return { deleted: true, taskId };
};