import * as taskRepo from '../../infrastructure/repositories/task_repo';
import {
    validateStringLength,
    validateEnum,
    validateDate
} from '../validators/task_validator';
import { TaskStatus, TaskPriority } from '../../domain/base/task_enums';

export const updateTask = async (taskId, updates, userId) => {
    const existing = await taskRepo.findTaskByID(taskId);
    taskRepo.ensureTaskOwnership(existing, userId);
    const validatedUpdates = {};

    if (updates.title !== undefined) {
        validatedUpdates.title = validateStringLength(updates.title, 'title', 3, 100);
    }
    if (updates.description !== undefined) {
        validatedUpdates.description = updates.description;
    }
    if (updates.status !== undefined) {
        validatedUpdates.status = validateEnum(updates.status, TaskStatus, 'status');
    }
    if (updates.priority !== undefined) {
        validatedUpdates.priority = validateEnum(updates.priority, TaskPriority, 'priority');
    }
    if (updates.dueDate !== undefined) {
        validatedUpdates.dueDate = updates.dueDate ? validateDate(updates.dueDate, 'dueDate', false, false) : null;
    }

    return await taskRepo.updateTask(taskId, validatedUpdates);
};