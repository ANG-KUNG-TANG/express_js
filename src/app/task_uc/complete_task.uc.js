// src/app/task_uc/complete_task.uc.js

import * as taskRepo from '../../infrastructure/repositories/task_repo.js';
import { TaskValidationError } from '../../core/errors/task.errors.js';
import { sendNotificationUseCase } from '../notification/send_noti.uc.js';
// FIX: NotificationType lives in the notification entity, not task_enums
// AssignmentNotiType does not exist — removed
import { NotificationType } from '../../domain/entities/notificaiton_entity.js';
import { TaskSource, AssignmentStatus } from '../../domain/base/task_enums.js';

export const submitTask = async (taskId, userId, submissionText) => {
    // ── Validate input ────────────────────────────────────────────────────────
    if (!submissionText || typeof submissionText !== 'string' || !submissionText.trim()) {
        throw new TaskValidationError('submissionText is required');
    }

    const task = await taskRepo.findTaskByID(taskId);
    taskRepo.ensureTaskOwnership(task, userId);

    // ── Assignment guard ──────────────────────────────────────────────────────
    // Assigned tasks must be accepted before the student can submit
    if (task._assignedBy && task._assignmentStatus !== AssignmentStatus.ACCEPTED) {
        throw new TaskValidationError(
            `You must accept this task before submitting. Current state: "${task._assignmentStatus}"`
        );
    }

    // ── Submit ────────────────────────────────────────────────────────────────
    const submitted = await taskRepo.submitTask(taskId, submissionText);

    // ── Notify the teacher who assigned it ────────────────────────────────────
    const isAssigned = task._source !== TaskSource.SELF && task._assignedBy;

    if (isAssigned) {
        // FIX: use NotificationType.TASK_SUBMITTED (from notification entity)
        // FIX: sendNotificationUseCase requires userId, type, title, message
        sendNotificationUseCase({
            userId:  String(task._assignedBy),
            type:    NotificationType.TASK_SUBMITTED,
            title:   'Task submitted for review',
            message: `A student submitted "${task._title}" — it is ready for your review.`,
            metadata: {
                taskId:    String(task._id),
                studentId: userId,
            },
        }).catch(err =>
            console.error('[submitTask] Failed to notify teacher:', err.message)
        );
    }

    return submitted;
};