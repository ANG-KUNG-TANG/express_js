// src/app/task_uc/complete_task.uc.js

import * as taskRepo                         from '../../infrastructure/repositories/task_repo.js';
import { TaskValidationError }               from '../../core/errors/task.errors.js';
import { NotificationService }               from '../../core/services/notification.service.js';
import { TaskSource, AssignmentStatus }      from '../../domain/base/task_enums.js';
import { recordAudit, recordFailure }        from '../../core/services/audit.service.js';
import { AuditAction }                       from '../../domain/base/audit_enums.js';

// req passed from controller so IP + userAgent are captured
export const submitTask = async (taskId, userId, submissionText, req = null) => {
    // ── Validate input ────────────────────────────────────────────────────────
    if (!submissionText || typeof submissionText !== 'string' || !submissionText.trim()) {
        throw new TaskValidationError('submissionText is required');
    }

    const task = await taskRepo.findTaskByID(taskId);
    taskRepo.ensureTaskOwnership(task, userId);

    // ── Assignment guard ──────────────────────────────────────────────────────
    if (task._assignedBy && task._assignmentStatus !== AssignmentStatus.ACCEPTED) {
        recordFailure(AuditAction.TASK_SUBMITTED, userId, {
            taskId,
            reason:           'task not accepted before submission',
            assignmentStatus: task._assignmentStatus,
        }, req);
        throw new TaskValidationError(
            `You must accept this task before submitting. Current state: "${task._assignmentStatus}"`
        );
    }

    // ── Submit ────────────────────────────────────────────────────────────────
    const submitted = await taskRepo.submitTask(taskId, submissionText);

    recordAudit(AuditAction.TASK_SUBMITTED, userId, {
        taskId,
        taskTitle:  task._title,
        isAssigned: !!(task._source !== TaskSource.SELF && task._assignedBy),
        teacherId:  task._assignedBy ? String(task._assignedBy) : null,
    }, req);

    // ── Notify teacher (assigned tasks only) ─────────────────────────────────
    const isAssigned = task._source !== TaskSource.SELF && task._assignedBy;
    if (isAssigned) {
        NotificationService.send({
            recipientId: String(task._assignedBy),
            actorId:     String(userId),
            type:        NotificationService.TYPES.TASK_SUBMITTED,
            title:       'Task submitted for review',
            message:     `A student submitted "${task._title}" — it is ready for your review.`,
            refId:       String(task._id),
            refModel:    'Task',
        });
    }

    return submitted;
};