import * as taskService from '../../core/services/task_service.js';
import { TaskValidationError } from '../../core/errors/task.errors.js';
import { NotificationService } from '../../core/services/notification.service.js';

export const scoreTask = async (taskId, scorerId, bandScore) => {
    // 1. Validate Input
    const score = Number(bandScore);
    if (isNaN(score) || score < 0 || score > 9) {
        throw new TaskValidationError('bandScore must be a number between 0 and 9');
    }

    // 2. Fetch via Service (Handles Redis Cache)
    const task = await taskService.getTaskById(taskId);

    // 3. Ownership check
    taskService.ensureTaskOwnership(task, scorerId);

    // 4. Score via Service (Handles Repo mutation + Cache Invalidation)
    const scored = await taskService.scoreTask(taskId, score);

    // 4. Notify Student (Use public getters)
    NotificationService.send({
        recipientId: String(task.userId),
        actorId:     String(scorerId),
        type:        NotificationService.TYPES.TASK_SCORED,
        title:       'Your task has been scored',
        message:     `Your task "${task.title}" received a score of ${score}/9`,
        refId:       String(task.id),
        refModel:    'Task',
    });

    return scored;
};