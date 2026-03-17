// src/app/task_uc/start_task.uc.js

import * as taskRepo from '../../infrastructure/repositories/task_repo.js';

export const startWritingTask = async (id, userId) => {
    const task = await taskRepo.findTaskByID(id);

    // Ownership check
    taskRepo.ensureTaskOwnership(task, userId);

    // entity.startWriting() handles all guards:
    //   - status must be ASSIGNED
    //   - if teacher-assigned, assignmentStatus must be ACCEPTED
    task.startWriting();

    return await taskRepo.updateTask(id, {
        status:    task._status,
        startedAt: task._startedAt,
    });
};