// src/app/teacher_uc/teacher_get_task.uc.js
import * as teacherService from '../../core/services/teacher_service.js';
import { TaskOwnershipError } from '../../core/errors/task.errors.js';
import { WritingStatus, TaskSource } from '../../domain/base/task_enums.js';
import logger from '../../core/logger/logger.js';

const ASSIGNED_ALLOWED = ['ASSIGNED', 'WRITING', 'SUBMITTED', 'REVIEWED', 'SCORED'];
const POOL_ALLOWED     = ['SUBMITTED', 'REVIEWED'];

export const teacherGetTaskUC = async (taskId) => {
    logger.debug('teacherGetTaskUC', { taskId });
    const task = await teacherService.getTask(taskId);

    // fix: use public getters not private _fields
    const isAssigned = task.source !== TaskSource.SELF && task.assignedBy;
    const allowed    = isAssigned ? ASSIGNED_ALLOWED : POOL_ALLOWED;

    if (!allowed.includes(task.status)) {
        throw new TaskOwnershipError(taskId, `Task status '${task.status}' is not accessible to teachers`);
    }

    return task;
};