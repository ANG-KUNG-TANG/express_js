// src/app/task_uc/respond_assignment.uc.js

import * as taskService                from '../../core/services/task_service.js';
import { NotificationService }         from '../../core/services/notification.service.js';
import { AssignmentStatus }            from '../../domain/base/task_enums.js';
import { TaskValidationError }         from '../../core/errors/task.errors.js';
import { recordAudit, recordFailure }  from '../../core/services/audit.service.js';
import { AuditAction }                 from '../../domain/base/audit_enums.js';

// req passed from controller so IP + userAgent are captured
export const respondAssignmentUC = async (student, { taskId, action, declineReason }, req = null) => {
    const studentId = String(student._id ?? student.id);

    // 1. Validation
    if (!['accept', 'decline'].includes(action)) {
        throw new TaskValidationError('action must be "accept" or "decline"');
    }
    if (action === 'decline' && !declineReason?.trim()) {
        throw new TaskValidationError('declineReason is required when declining');
    }

    // 2. Fetch via Service (handles Redis cache)
    const task = await taskService.getTaskById(taskId);
    taskService.ensureTaskOwnership(task, studentId);

    // 3. Status guard
    if (task.assignmentStatus !== AssignmentStatus.PENDING_ACCEPTANCE) {
        recordFailure(AuditAction.TASK_ASSIGNMENT_RESPONDED, studentId, {
            taskId,
            action,
            reason:           'task not in PENDING_ACCEPTANCE state',
            assignmentStatus: task.assignmentStatus,
        }, req);
        throw new TaskValidationError(
            `Cannot respond — assignment is already "${task.assignmentStatus}"`
        );
    }

    // 4. Delegate mutation to Service (handles repo update + cache invalidation)
    const updated = await (action === 'accept'
        ? taskService.acceptAssignment(taskId)
        : taskService.declineAssignment(taskId, declineReason.trim()));

    // 5. Audit
    recordAudit(AuditAction.TASK_ASSIGNMENT_RESPONDED, studentId, {
        taskId,
        taskTitle:    task.title,
        action,
        teacherId:    task.assignedBy ? String(task.assignedBy) : null,
        declineReason: action === 'decline' ? declineReason.trim() : undefined,
    }, req);

    // 6. Notify teacher
    if (task.assignedBy) {
        const studentName = student.name ?? 'A student';
        const isAccepted  = action === 'accept';

        NotificationService.send({
            recipientId: String(task.assignedBy),
            actorId:     studentId,
            type:        isAccepted ? NotificationService.TYPES.TASK_ACCEPTED : NotificationService.TYPES.TASK_DECLINED,
            title:       isAccepted ? 'Student accepted your task' : 'Student declined your task',
            message:     isAccepted
                ? `${studentName} accepted "${task.title}" and will start writing.`
                : `${studentName} declined "${task.title}". Reason: ${declineReason?.trim()}`,
            refId:    String(task.id),
            refModel: 'Task',
        });
    }

    return updated;
};