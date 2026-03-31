// src/app/task_uc/review_task.uc.js
//
// Student submits their task for review (marks it SUBMITTED).
// Distinct from teacher_review_task_uc which is the teacher scoring it.

import * as taskRepo                   from '../../infrastructure/repositories/task_repo.js';
import { TaskValidationError }         from '../../core/errors/task.errors.js';
import { recordAudit, recordFailure }  from '../../core/services/audit.service.js';
import { AuditAction }                 from '../../domain/base/audit_enums.js';

// reviewerId = the student's userId (ownership is checked at controller level)
// req passed from controller so IP is captured
export const reviewTask = async (taskId, reviewerId, feedback, req = null) => {
    if (!feedback || typeof feedback !== 'string' || !feedback.trim()) {
        throw new TaskValidationError('feedback is required');
    }

    // Ensure task exists — throws NotFoundError if missing
    const task = await taskRepo.findTaskByID(taskId);

    const result = await taskRepo.reviewTask(taskId, feedback);

    recordAudit(AuditAction.TASK_REVIEWED_USER, reviewerId, {
        taskId,
        taskTitle: task._title ?? null,
    }, req);

    return result;
};