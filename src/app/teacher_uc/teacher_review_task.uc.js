// src/app/teacher_uc/teacher_review_task.uc.js
import * as teacherService             from '../../core/services/teacher_service.js';
import { NotificationService }         from '../../core/services/notification.service.js';
import { WritingStatus, TaskSource }   from '../../domain/base/task_enums.js';
import { ForbiddenError, ConflictError, ValidationError } from '../../core/errors/base.errors.js';
import { recordAudit, recordFailure }  from '../../core/services/audit.service.js';
import { AuditAction }                 from '../../domain/base/audit_enums.js';

export const teacherReviewTaskUC = async (teacher, { taskId, bandScore, feedback }, req = null) => {
    const teacherId = String(teacher.id ?? teacher._id);

    // fix: use public getters throughout — no more task._privateField access
    const task = await teacherService.getTask(taskId);

    if (task.source === TaskSource.SELF || !task.assignedBy) {
        recordFailure(AuditAction.TEACHER_TASK_REVIEWED, teacherId,
            { taskId, reason: 'self-created task' }, req);
        throw new ForbiddenError('Self-created tasks are reviewed by admins, not teachers');
    }

    if (task.assignedBy.toString() !== teacherId) {
        recordFailure(AuditAction.TEACHER_TASK_REVIEWED, teacherId,
            { taskId, reason: 'teacher did not assign this task' }, req);
        throw new ForbiddenError('You can only review tasks that you assigned');
    }

    if (task.status !== WritingStatus.SUBMITTED) {
        recordFailure(AuditAction.TEACHER_TASK_REVIEWED, teacherId,
            { taskId, reason: 'task not in SUBMITTED state', currentStatus: task.status }, req);
        throw new ConflictError(`Task status is "${task.status}". Only SUBMITTED tasks can be reviewed.`);
    }

    if (!feedback?.trim()) throw new ValidationError('feedback is required');
    const score = Number(bandScore);
    if (isNaN(score) || score < 0 || score > 9) {
        throw new ValidationError('bandScore must be a number between 0 and 9');
    }

    await teacherService.reviewTask(taskId, feedback.trim());
    const scored = await teacherService.scoreTask(taskId, score);

    recordAudit(AuditAction.TEACHER_TASK_REVIEWED, teacherId,
        { taskId, studentId: String(task.assignedTo), taskTitle: task.title, bandScore: score }, req);

    NotificationService.send({
        recipientId: String(task.assignedTo),
        actorId:     teacherId,
        type:        NotificationService.TYPES.TASK_SCORED,
        title:       'Your task has been scored',
        message:     `Your task "${task.title}" received a score of ${score}/9`,
        refId:       String(task.id),
        refModel:    'Task',
    });

    return scored;
};