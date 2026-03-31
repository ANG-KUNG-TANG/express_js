// src/app/teacher_uc/teacher_review_task.uc.js

import {
    findTaskByID,
    reviewTask,
    scoreTask,
} from '../../infrastructure/repositories/task_repo.js';
import { NotificationService }          from '../../core/services/notification.service.js';
import { WritingStatus, TaskSource }    from '../../domain/base/task_enums.js';
import {
    NotFoundError,
    ForbiddenError,
    ConflictError,
    ValidationError,
} from '../../core/errors/base.errors.js';
import { recordAudit, recordFailure }   from '../../core/services/audit.service.js';
import { AuditAction }                  from '../../domain/base/audit_enums.js';

export async function teacherReviewTaskUC(teacher, { taskId, bandScore, feedback }, req = null) {
    const teacherId = String(teacher._id ?? teacher.id);

    // ── 1. Fetch ──────────────────────────────────────────────────────────────
    const task = await findTaskByID(taskId);
    if (!task) throw new NotFoundError('Task not found');

    // ── 2. Must be an assigned task ───────────────────────────────────────────
    if (task._source === TaskSource.SELF || !task._assignedBy) {
        recordFailure(AuditAction.TEACHER_TASK_REVIEWED, teacherId, {
            taskId,
            reason: 'self-created task — not reviewable by teacher',
        }, req);
        throw new ForbiddenError('Self-created tasks are reviewed by admins, not teachers');
    }

    // ── 3. Only the assigning teacher may review ──────────────────────────────
    if (task._assignedBy.toString() !== teacherId) {
        recordFailure(AuditAction.TEACHER_TASK_REVIEWED, teacherId, {
            taskId,
            reason: 'teacher did not assign this task',
        }, req);
        throw new ForbiddenError('You can only review tasks that you assigned');
    }

    // ── 4. Must be SUBMITTED ──────────────────────────────────────────────────
    if (task._status !== WritingStatus.SUBMITTED) {
        recordFailure(AuditAction.TEACHER_TASK_REVIEWED, teacherId, {
            taskId,
            reason:        'task not in SUBMITTED state',
            currentStatus: task._status,
        }, req);
        throw new ConflictError(
            `Task status is "${task._status}". Only SUBMITTED tasks can be reviewed.`
        );
    }

    // ── 5. Validate inputs ────────────────────────────────────────────────────
    if (!feedback?.trim()) throw new ValidationError('feedback is required');
    const score = Number(bandScore);
    if (isNaN(score) || score < 0 || score > 9) {
        throw new ValidationError('bandScore must be a number between 0 and 9');
    }

    // ── 6. Two-step state transition: SUBMITTED → REVIEWED → SCORED ──────────
    await reviewTask(taskId, feedback.trim());
    const scored = await scoreTask(taskId, score);

    // ── 7. Audit ──────────────────────────────────────────────────────────────
    recordAudit(AuditAction.TEACHER_TASK_REVIEWED, teacherId, {
        taskId,
        studentId:  String(task._assignedTo),
        taskTitle:  task._title,
        bandScore:  score,
    }, req);

    // ── 8. Notify student ─────────────────────────────────────────────────────
    NotificationService.send({
        recipientId: String(task._assignedTo),
        actorId:     teacherId,
        type:        NotificationService.TYPES.TASK_SCORED,
        title:       'Your task has been scored',
        message:     `Your task "${task._title}" received a score of ${score}/9`,
        refId:       String(task._id),
        refModel:    'Task',
    });

    return scored;
}