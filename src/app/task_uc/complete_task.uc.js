import * as taskRepo from '../../infrastructure/repositories/task_repo.js';
import { TaskValidationError } from '../../core/errors/task.errors.js';

export const submitTask = async (taskId, userId, submissionText) => {
    if (!submissionText || typeof submissionText !== 'string' || !submissionText.trim()) {
        throw new TaskValidationError('submissionText is required');
    }
    const task = await taskRepo.findTaskByID(taskId);
    taskRepo.ensureTaskOwnership(task, userId);
    return await taskRepo.submitTask(taskId, submissionText);
};