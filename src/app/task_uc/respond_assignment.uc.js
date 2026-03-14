/**
 * respond_assignment.uc.js
 *
 * Student accepts or declines a teacher-assigned task.
 *
 * Accept:  assignmentStatus → accepted  (status stays ASSIGNED — student starts separately)
 * Decline: assignmentStatus → declined  (teacher is notified with the reason)
 *
 * Uses repo helpers acceptAssignment() / declineAssignment() which call the
 * entity methods, so all validation stays in WritingTask.
 */

import {
    findTaskByID,
    acceptAssignment,
    declineAssignment,
} from '../../infrastructure/repositories/task_repo.js';
import { sendNotificationUseCase } from '../notification/send_noti.uc.js';
import { NotificationType } from '../../domain/entities/notificaiton_entity.js';
import { TaskSource } from '../../domain/base/task_enums.js';
import {
    NotFoundError,
    ForbiddenError,
    ValidationError,
} from '../../core/errors/base.errors.js';

export async function respondAssignmentUC(student, { taskId, action, declineReason }) {
    // 1. Fetch task
    const task = await findTaskByID(taskId);

    // 2. Must be assigned to this student
    if (task._assignedTo?.toString() !== student.id.toString()) {
        throw new ForbiddenError('This task was not assigned to you');
    }

    // 3. Must be an assigned task (not self-created)
    if (task._source === TaskSource.SELF || !task._assignedBy) {
        throw new ForbiddenError('This is not an assigned task');
    }

    // 4. Validate action
    if (!['accept', 'decline'].includes(action)) {
        throw new ValidationError('action must be "accept" or "decline"');
    }
    if (action === 'decline' && !declineReason?.trim()) {
        throw new ValidationError('declineReason is required when declining');
    }

    // 5. Delegate to repo (which calls entity method — throws if already responded)
    let updated;
    if (action === 'accept') {
        updated = await acceptAssignment(taskId);
    } else {
        updated = await declineAssignment(taskId, declineReason.trim());

        // Notify the assigning teacher
        await sendNotificationUseCase({
            userId:  task._assignedBy,
            type:    NotificationType.TASK_DECLINED,
            title:   'Task declined by student',
            message: `${student.firstName} ${student.lastName} declined "${task._title}"`,
            metadata: {
                taskId:       task._id,
                studentId:    student.id,
                studentName:  `${student.firstName} ${student.lastName}`,
                declineReason: declineReason.trim(),
            },
        });
    }

    return updated;
}