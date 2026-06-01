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
    
    // 3. Ownership Check (Business rule)
    taskService.ensureTaskOwnership(task, reviewerId);

    // 4. Delegate to Service (Handles Repo + Cache Invalidation)
    const result = await taskService.reviewTask(taskId, feedback);

    // 5. Audit (Use public getter)
    recordAudit(AuditAction.TASK_REVIEWED_USER, reviewerId, {
        taskId,
        taskTitle: task.title,
    }, req);

    return result;
};