import * as taskService from '../../core/services/task_service.js';

export const startWritingTask = async (id, userId) => {
    // 1. Fetch via Service (Handles Redis Cache)
    const task = await taskService.getTaskById(id);

    // 2. Ownership check
    taskService.ensureTaskOwnership(task, userId);

    // 3. Domain Logic: trigger the status transition
    // Note: ensure your entity has a startWriting() method
    task.startWriting();

    // 4. Delegate mutation to Service
    // The service will save to DB and clear the cache
    return await taskService.updateTask(id, (t) => t.startWriting());
};