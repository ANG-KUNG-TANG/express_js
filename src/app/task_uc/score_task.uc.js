// src/app/task_uc/score_task.uc.js

import * as taskRepo               from '../../infrastructure/repositories/task_repo.js';
import { TaskValidationError }     from '../../core/errors/task.errors.js';
import { NotificationService }     from '../../core/services/notification.service.js';

export const scoreTask = async (taskId, scorerId, bandScore) => {
    // ── Validate score ────────────────────────────────────────────────────────
    const score = Number(bandScore);
    if (isNaN(score) || score < 0 || score > 9) {
        throw new TaskValidationError('bandScore must be a number between 0 and 9');
    }

    // ── Fetch & score ─────────────────────────────────────────────────────────
    const task   = await taskRepo.findTaskByID(taskId);
    const scored = await taskRepo.scoreTask(taskId, score);

    // ── Notify student ────────────────────────────────────────────────────────
    // Fire-and-forget — NotificationService catches its own errors internally
    NotificationService.send({
        recipientId: String(task._userId ?? task.userId),
        actorId:     String(scorerId),
        type:        NotificationService.TYPES.TASK_SCORED,
        title:       'Your task has been scored',
        message:     `Your task "${task._title}" received a score of ${score}/9`,
        refId:       String(task._id),
        refModel:    'Task',
    });

    return scored;
};