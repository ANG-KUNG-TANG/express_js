import * as taskRepo from '../../infrastructure/repositories/task_repo';
import { ensureTaskOwnership } from '../../infrastructure/repositories/task_repo';
import {
    validateStringLength,
    validateEnum,
    validateDate
} from '../validators/task_validator';
import { TaskStatus,TaskPriority } from '../../domain/base/task_enums';

export const updateTask = async (taskId, updateTask, userId) =>{
    const existing = await taskRepo.findTaskByID(taskId);
    ensureTaskOwnership(existing, userId);
    const validatedUpdates = {};
    
    if (updateTask.title !== undefined) {
        validatedUpdates.title = validateStringLength(updateTask.title, 'title', 3, 100);
    }
    if (updateTask.description !== undefined){
        validatedUpdates.status = validateEnum(updateTask, TaskStatus, 'status');
    }
    if  (updateTask.priority !== undefined){
        validatedUpdates.priority = validateEnum(updateTask.priority, TaskPriority, 'priority');
    }
    if (updateTask.dueDate !== undefined){
        validatedUpdates.dueDate = updateTask.dueDate ? validateDate(updateTask.dueDate, 'dueDate', false, false): null;
    }
    return await taskRepo.updateTask(taskId, validatedUpdates);
};