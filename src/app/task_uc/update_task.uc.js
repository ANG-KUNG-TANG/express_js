// update_writing_task_uc.js
import * as taskRepo from '../../infrastructure/repositories/task_repo.js';
import {
    validateStringLength,
    validateEnum,
} from '../../app/validators/task_validator.js';
import { WritingStatus, TaskType, ExamType } from '../../domain/base/task_enums.js';

export const updateWritingTask = async (taskId, updates, userId) => {
    const existing = await taskRepo.findTaskByID(taskId);
    taskRepo.ensureTaskOwnership(existing, userId);

    const validatedUpdates = {};

    if (updates.title          !== undefined) validatedUpdates.title          = validateStringLength(updates.title, 'title', 3, 100);
    if (updates.description    !== undefined) validatedUpdates.description    = updates.description;
    if (updates.questionPrompt !== undefined) validatedUpdates.questionPrompt = updates.questionPrompt;
    if (updates.taskType       !== undefined) validatedUpdates.taskType       = validateEnum(updates.taskType, TaskType, 'taskType');
    if (updates.examType       !== undefined) validatedUpdates.examType       = validateEnum(updates.examType, ExamType, 'examType');
    // status changes are only allowed through the dedicated transition UCs (submit, review, score, startWriting)

    return await taskRepo.updateTask(taskId, validatedUpdates);
};