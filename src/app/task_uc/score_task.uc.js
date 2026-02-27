import * as taskRepo from '../../infrastructure/repositories/task_repo.js';
import { TaskValidationError } from '../../core/errors/task.errors.js';

export const scoreTask = async (taskId, scorerId, bandScore) => {
    const score = Number(bandScore);
    if (isNaN(score) || score < 0 || score > 9) {
        throw new TaskValidationError('bandScore must be a number between 0 and 9');
    }
    await taskRepo.findTaskByID(taskId); // ensures task exists
    return await taskRepo.scoreTask(taskId, score);
};