import { createWritingTask as serviceCreate } from '../../core/services/task_service.js';
import { validateRequired, validateStringLength, validateEnum } from '../../domain/validators/task_validator.js';
import { TaskType, ExamType } from '../../domain/base/task_enums.js';

export const createWritingTask = async (userId, data) => {
    // 1. Validation
    validateRequired(userId, 'userId');
    const title = validateStringLength(data.title, 'title', 3, 100);
    const taskType = validateEnum(data.taskType, TaskType, 'taskType');
    const examType = validateEnum(data.examType, ExamType, 'examType');

    // 2. Orchestration via Service
    return await serviceCreate({ 
        title, 
        description: data.description || '', 
        taskType, 
        examType, 
        questionPrompt: data.questionPrompt || '', 
        userId 
    });
};