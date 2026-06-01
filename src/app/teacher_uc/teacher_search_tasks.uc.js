// src/app/teacher_uc/teacher_search_tasks.uc.js
import * as teacherService from '../../core/services/teacher_service.js';
import logger from '../../core/logger/logger.js';

export const teacherSearchTasksUC = async ({ teacherId, q } = {}) => {
    logger.debug('teacherSearchTasksUC', { teacherId, q });
    const tasks = await teacherService.searchTasks(teacherId, q);
    logger.debug('teacherSearchTasksUC: done', { count: tasks.length });
    return tasks;
};