import * as taskService from '../../core/services/task_service.js'; // Use the Service
import { recordAudit }  from '../../core/services/audit.service.js';
import { AuditAction }  from '../../domain/base/audit_enums.js';

export const deleteWritingTask = async (taskId, userId, req = null) => {
    // 1. Fetch via Service (which handles cache-aside)
    const task = await taskService.getTaskById(taskId);
    
    // 2. Business Rule: Ensure Ownership
    // Note: ensureTaskOwnership logic should ideally be inside the UC or Service
    taskService.ensureTaskOwnership(task, userId);

    // 3. Delete via Service (Service handles Repo + Cache Invalidation)
    await taskService.deleteTask(taskId);

    // 4. Audit
    recordAudit(AuditAction.TASK_DELETED, userId, {
        taskId,
        taskTitle:  task.title, // Use public getter, not _title
        taskSource: task.source,
        assignedBy: task.assignedBy ? String(task.assignedBy) : null,
    }, req);

    return {
        deleted: true,
        taskId:  task.id,
        title:   task.title,
    };
};