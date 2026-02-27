import * as taskRepo from '../../infrastructure/repositories/task_repo.js';
import { TaskValidationError } from '../../core/errors/task.errors.js';

export const reviewTask = async (taskId, reviewerId, feedback) => {
    if (!feedback || typeof feedback !== 'string' || !feedback.trim()) {
        throw new TaskValidationError('feedback is required');
    }
    // Ownership check intentionally omitted — reviewers are not the task owner.
    // Add role-based guard at the controller/middleware level instead.
    await taskRepo.findTaskByID(taskId); // ensures task exists
    return await taskRepo.reviewTask(taskId, feedback);
};