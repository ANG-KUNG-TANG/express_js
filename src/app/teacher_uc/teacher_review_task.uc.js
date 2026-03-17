/**
 * teacher_review_task.uc.js
 *
 * Teacher reviews and scores a submitted assigned task.
 *
 * Your WritingTask state machine requires TWO steps after SUBMITTED:
 *   SUBMITTED → review(feedback) → REVIEWED → score(bandScore) → SCORED
 *
 * This UC does both in one call for simplicity (teacher submits feedback + score together).
 *
 * Guards:
 *   - task.source must not be 'self'
 *   - task._assignedBy must equal teacher.id
 *   - task._status must be SUBMITTED
 *
 * After scoring:
 *   - status → SCORED
 *   - Fires TASK_SCORED notification to student
 */

import {
    findTaskByID,
    reviewTask,
    scoreTask,
} from '../../infrastructure/repositories/task_repo.js';
import { sendNotificationUseCase } from '../notification/send_noti.uc.js';
import { NotificationType } from '../../domain/entities/notificaiton_entity.js';
import { WritingStatus } from '../../domain/base/task_enums.js';
import { TaskSource } from '../../domain/base/task_enums.js';
import {
    NotFoundError,
    ForbiddenError,
    ConflictError,
    ValidationError,
} from '../../core/errors/base.errors.js';

export async function teacherReviewTaskUC(teacher, { taskId, bandScore, feedback }) {
    // 1. Fetch
    const task = await findTaskByID(taskId);
    if (!task) throw new NotFoundError('Task not found');

    // 2. Must be an assigned task (not self-created → admin queue)
    if (task._source === TaskSource.SELF || !task._assignedBy) {
        throw new ForbiddenError('Self-created tasks are reviewed by admins, not teachers');
    }

    // 3. Only the assigning teacher may review
    if (task._assignedBy.toString() !== teacher.id.toString()) {
        throw new ForbiddenError('You can only review tasks that you assigned');
    }

    // 4. Must be SUBMITTED
    if (task._status !== WritingStatus.SUBMITTED) {
        throw new ConflictError(
            `Task status is "${task._status}". Only SUBMITTED tasks can be reviewed.`
        );
    }

    // 5. Validate inputs
    if (!feedback?.trim()) throw new ValidationError('feedback is required');
    const score = Number(bandScore);
    if (isNaN(score) || score < 0 || score > 9) {
        throw new ValidationError('bandScore must be a number between 0 and 9');
    }

    // 6. Two-step state transition: SUBMITTED → REVIEWED → SCORED
    //    reviewTask() calls task.review(feedback) on the entity
    await reviewTask(taskId, feedback.trim());
    //    scoreTask() calls task.score(bandScore) on the entity
    const scored = await scoreTask(taskId, score);

    // 7. Notify student
    await sendNotificationUseCase({
        userId:  task._assignedTo,
        type:    NotificationType.TASK_SCORED,
        title:   'Your task has been scored',
        message: `Your task "${task._title}" has been scored: ${score}/9`,
        metadata: {
            taskId:   task._id,
            score,
            feedback: feedback.trim(),
            teacherId: teacher.id,
        },
    });

    return scored;
}