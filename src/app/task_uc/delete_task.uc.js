// src/app/task_uc/delete_task.uc.js

import * as taskRepo                   from '../../infrastructure/repositories/task_repo.js';
import { recordAudit }  from '../../core/services/audit.service.js';
import { AuditAction }                 from '../../domain/base/audit_enums.js';

// req passed from controller so IP + userAgent are captured
export const deleteWritingTask = async (taskId, userId, req = null) => {
    const task = await taskRepo.findTaskByID(taskId);
    taskRepo.ensureTaskOwnership(task, userId);

    await taskRepo.deleteTask(taskId);

    // Log after successful delete — include title so the admin dashboard
    // shows what was deleted, not just a bare ID
    recordAudit(AuditAction.TASK_DELETED, userId, {
        taskId,
        taskTitle:  task._title ?? task.title ?? null,
        taskSource: task._source ?? null,
        assignedBy: task._assignedBy ? String(task._assignedBy) : null,
    }, req);

    return {
        deleted: true,
        taskId:  task.id ?? task._id?.toString(),
        title:   task._title ?? task.title ?? null,
    };
};