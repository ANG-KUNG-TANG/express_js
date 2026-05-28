import * as taskService from '../../core/services/task_service.js';
import { TaskValidationError } from '../../core/errors/task.errors.js';
import { NotificationService } from '../../core/services/notification.service.js';
import { TaskSource, AssignmentStatus } from '../../domain/base/task_enums.js';
import { recordAudit, recordFailure } from '../../core/services/audit.service.js';
import { AuditAction } from '../../domain/base/audit_enums.js';

export const submitTask = async (taskId, userId, submissionText, req = null) => {
    // 1. Validate Input (Keep this here: UCs handle business rules/input)
    if (!submissionText || typeof submissionText !== 'string' || !submissionText.trim()) {
        throw new TaskValidationError('submissionText is required');
    }

    // 2. Fetch via Service (Handles Cache check)
    const task = await taskService.getTaskById(taskId);
    taskService.ensureTaskOwnership(task, userId);

    // 3. Assignment Guard (Domain Logic)
    if (task.assignedBy && task.assignmentStatus !== AssignmentStatus.ACCEPTED) {
        recordFailure(AuditAction.TASK_SUBMITTED, userId, {
            taskId,
            reason: 'task not accepted before submission',
            assignmentStatus: task.assignmentStatus,
        }, req);
        throw new TaskValidationError(
            `You must accept this task before submitting. Current state: "${task.assignmentStatus}"`
        );
    }

    // 4. Submit via Service (Handles Repo mutation + Cache Invalidation)
    const submitted = await taskService.submitTask(taskId, submissionText);

    // 5. Audit & Notifications
    recordAudit(AuditAction.TASK_SUBMITTED, userId, {
        taskId,
        taskTitle:  task.title,
        isAssigned: task.isAssigned(),
        teacherId:  task.assignedBy ? String(task.assignedBy) : null,
    }, req);

    if (task.isAssigned()) {
        NotificationService.send({
            recipientId: String(task.assignedBy),
            actorId:     String(userId),
            type:        NotificationService.TYPES.TASK_SUBMITTED,
            title:       'Task submitted for review',
            message:     `A student submitted "${task.title}" — it is ready for your review.`,
            refId:       String(task.id),
            refModel:    'Task',
        });
    }

    return submitted;
};