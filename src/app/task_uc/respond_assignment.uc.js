// src/app/task_uc/respond_assignment.uc.js
//
// Called when Alice (student) accepts or declines a teacher-assigned task.
// Uses the WritingTask entity's acceptAssignment() / declineAssignment() methods.
//
// Route: POST /api/writing-tasks/:taskId/respond-assignment
// Body:  { action: 'accept' | 'decline', declineReason?: string }

import * as taskRepo from '../../infrastructure/repositories/task_repo.js';
import { sendNotificationUseCase } from '../notification/send_noti.uc.js';
import { NotificationType }        from '../../domain/entities/notificaiton_entity.js';
import { AssignmentStatus }        from '../../domain/base/task_enums.js';
import { TaskValidationError }     from '../../core/errors/task.errors.js';

export const respondAssignmentUC = async (student, { taskId, action, declineReason }) => {
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

    // ── Persist the updated assignmentStatus (and declineReason if declined) ──
    const updated = await taskRepo.updateTask(taskId, {
        assignmentStatus: task._assignmentStatus,
        ...(action === 'decline' && { declineReason: task._declineReason }),
    });

    // ── Notify teacher ────────────────────────────────────────────────────────
    if (task._assignedBy) {
        const studentName = student.name ?? student._name ?? 'A student';
        const isAccepted  = action === 'accept';

        sendNotificationUseCase({
            userId:  String(task._assignedBy),
            type:    isAccepted
                ? NotificationType.TASK_ASSIGNED   // closest available — use task_assigned for accept
                : NotificationType.TASK_DECLINED,  // task_declined for reject
            title:   isAccepted
                ? 'Student accepted your task'
                : 'Student declined your task',
            message: isAccepted
                ? `${studentName} accepted "${task._title}" and will start writing.`
                : `${studentName} declined "${task._title}". Reason: ${declineReason?.trim()}`,
            metadata: {
                taskId,
                studentId,
                studentName,
                action,
                ...(action === 'decline' && { declineReason: declineReason?.trim() }),
            },
        }).catch(err =>
            console.error('[respondAssignmentUC] notification failed:', err.message)
        );
    }

    return updated;
};