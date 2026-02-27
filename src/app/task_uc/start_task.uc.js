import * as taskRepo from '../../infrastructure/repositories/task_repo.js';
import {
    validateRequired,
    validateStringLength,
    validateEnum,
} from '../../app/validators/task_validator.js';
import { TaskType, ExamType } from '../../domain/base/task_enums.js';

export const createWritingTask = async (userId, data) => {
    validateRequired(userId, 'userId');
    const title         = validateStringLength(data.title, 'title', 3, 100);
    const description   = data.description || '';
    const taskType      = validateEnum(data.taskType, TaskType, 'taskType');
    const examType      = validateEnum(data.examType, ExamType, 'examType');
    const questionPrompt = data.questionPrompt || '';

    const taskData = { title, description, taskType, examType, questionPrompt, userId };
    return await taskRepo.createTask(taskData);
};