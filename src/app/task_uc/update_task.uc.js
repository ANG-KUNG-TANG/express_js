import * as taskService from '../../core/services/task_service.js';
import { validateStringLength, validateEnum } from '../../domain/validators/task_validator.js';
import { TaskType, ExamType } from '../../domain/base/task_enums.js';

export const updateWritingTask = async (taskId, updates, userId) => {
    // 1. Fetch via Service (Handles Redis Cache)
    const task = await taskService.getTaskById(taskId);
    
    // 2. Ownership check
    taskService.ensureTaskOwnership(task, userId);

    // 3. Prepare validated updates
    const validatedUpdates = {};
    if (updates.title !== undefined) validatedUpdates.title = validateStringLength(updates.title, 'title', 3, 100);
    if (updates.description !== undefined) validatedUpdates.description = updates.description;
    if (updates.questionPrompt !== undefined) validatedUpdates.questionPrompt = updates.questionPrompt;
    if (updates.taskType !== undefined) validatedUpdates.taskType = validateEnum(updates.taskType, TaskType, 'taskType');
    if (updates.examType !== undefined) validatedUpdates.examType = validateEnum(updates.examType, ExamType, 'examType');

    // 4. Delegate to Service (Handles Repo + Cache Invalidation)
    return await taskService.updateTask(taskId, (t) => {
        t.updateDetails(
            validatedUpdates.title          ?? t.title,
            validatedUpdates.description    ?? t.description,
            validatedUpdates.questionPrompt ?? t.questionPrompt,
            validatedUpdates.taskType       ?? t.taskType,
            validatedUpdates.examType       ?? t.examType,
        );
    });
};