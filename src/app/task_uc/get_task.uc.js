import * as taskService from '../../core/services/task_service.js'; // Ensure path is correct

export const getWritingTaskById = async (taskId, requestingUserId = null) => {
    // 1. Fetch via Service (Handles Redis Cache-Aside + Repo fallback)
    const task = await taskService.getTaskById(taskId);
    
    // 2. Ownership Check (Business rule: ensure user has rights to this task)
    if (requestingUserId) {
        taskService.ensureTaskOwnership(task, requestingUserId);
    }
    
    return task;
};