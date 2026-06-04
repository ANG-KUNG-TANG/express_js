import * as taskService from '../../core/services/task_service.js';
import { TaskValidationError } from '../../core/errors/task.errors.js';
import { recordAudit } from '../../core/services/audit.service.js';
import { AuditAction } from '../../domain/base/audit_enums.js';

export const reviewTask = async (taskId, reviewerId, feedback, req = null) => {
    // 1. Input Validation
    if (!feedback || typeof feedback !== 'string' || !feedback.trim()) {
        throw new TaskValidationError('feedback is required');
    }

    // 2. Fetch via Service (Handles Redis Cache)
    const task = await taskService.getTaskById(taskId);
    
    // 3. Authorization check — teacher must be the assigning teacher;
    //    for self-created tasks the reviewer must be the task owner.
    if (task.assignedBy) {
        if (task.assignedBy.toString() !== reviewerId.toString()) {
            throw new TaskValidationError('Only the assigning teacher can review this task');
        }
    } else {
        taskService.ensureTaskOwnership(task, reviewerId);
    }

    // 4. Delegate to Service (Handles Repo + Cache Invalidation)
    const result = await taskService.reviewTask(taskId, feedback);

    // 5. Audit (Use public getter)
    recordAudit(AuditAction.TASK_REVIEWED_USER, reviewerId, {
        taskId,
        taskTitle: task.title,
    }, req);

    return result;
};