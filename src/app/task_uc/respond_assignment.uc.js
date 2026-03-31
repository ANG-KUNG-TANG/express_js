// src/app/task_uc/respond_assignment.uc.js

import * as taskRepo                   from '../../infrastructure/repositories/task_repo.js';
import { NotificationService }         from '../../core/services/notification.service.js';
import { AssignmentStatus }            from '../../domain/base/task_enums.js';
import { TaskValidationError }         from '../../core/errors/task.errors.js';
import { recordAudit, recordFailure }  from '../../core/services/audit.service.js';
import { AuditAction }                 from '../../domain/base/audit_enums.js';

// req passed from controller so IP + userAgent are captured
export const respondAssignmentUC = async (student, { taskId, action, declineReason }, req = null) => {
    const studentId = String(student._id ?? student.id);

    // ── Validate action ───────────────────────────────────────────────────────
    if (!['accept', 'decline'].includes(action)) {
        throw new TaskValidationError('action must be "accept" or "decline"');
    }
    if (action === 'decline' && !declineReason?.trim()) {
        throw new TaskValidationError('declineReason is required when declining a task');
    }

    // ── Fetch & verify ownership ──────────────────────────────────────────────
    const task = await taskRepo.findTaskByID(taskId);
    taskRepo.ensureTaskOwnership(task, studentId);

    // ── Guard: must be PENDING_ACCEPTANCE ─────────────────────────────────────
    if (task._assignmentStatus !== AssignmentStatus.PENDING_ACCEPTANCE) {
        recordFailure(AuditAction.TASK_ASSIGNMENT_RESPONDED, studentId, {
            taskId,
            action,
            reason:           'task not in PENDING_ACCEPTANCE state',
            assignmentStatus: task._assignmentStatus,
        }, req);
        throw new TaskValidationError(
            `Cannot respond — assignment is already "${task._assignmentStatus}"`
        );
    }

    // ── Transition via entity ─────────────────────────────────────────────────
    if (action === 'accept') {
        task.acceptAssignment();
    } else {
        task.declineAssignment(declineReason.trim());
    }

    // ── Persist ───────────────────────────────────────────────────────────────
    const updated = await taskRepo.updateTask(taskId, {
        assignmentStatus: task._assignmentStatus,
        ...(action === 'decline' && { declineReason: task._declineReason }),
    });

    // ── Audit ─────────────────────────────────────────────────────────────────
    recordAudit(AuditAction.TASK_ASSIGNMENT_RESPONDED, studentId, {
        taskId,
        taskTitle:     task._title,
        action,
        teacherId:     task._assignedBy ? String(task._assignedBy) : null,
        declineReason: action === 'decline' ? declineReason.trim() : undefined,
    }, req);

    // ── Notify teacher ────────────────────────────────────────────────────────
    if (task._assignedBy) {
        const studentName = student.name ?? student._name ?? 'A student';
        const isAccepted  = action === 'accept';

        NotificationService.send({
            recipientId: String(task._assignedBy),
            actorId:     studentId,
            type:    isAccepted
                ? NotificationService.TYPES.TASK_ACCEPTED
                : NotificationService.TYPES.TASK_DECLINED,
            title:   isAccepted
                ? 'Student accepted your task'
                : 'Student declined your task',
            message: isAccepted
                ? `${studentName} accepted "${task._title}" and will start writing.`
                : `${studentName} declined "${task._title}". Reason: ${declineReason?.trim()}`,
            refId:    String(task._id),
            refModel: 'Task',
        });
    }

    return updated;
};