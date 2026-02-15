import * as taskRepo from "../../infrastructure/repositories/task_repo";
import {
    validateRequired,
    validateStringLength,
    validateEnum,
    validateDate
} from '../../app/validators/task_validator';
import { TaskPriority, TaskStatus } from "../../domain/base/task_enums";


export const createTask = async (userId, data) =>{
    validateRequired(userId, 'userId');
    const title = validateStringLength(data.title, 'title', 3, 100);
    const description = data.description || '';
    const status = data.status ? validateEnum(data.status, TaskStatus, 'status'): undefined;
    const priority = data.priority ? validateEnum(data.TaskPriority, TaskPriority, 'priority'): undefined;
    const dueDate = data.dueDate ? validateDate(data.dueDate, 'dueDate', false, false): null;

    const taskData = {title, description, status, priority, userId};
    return await taskRepo.createTask(taskData);
}