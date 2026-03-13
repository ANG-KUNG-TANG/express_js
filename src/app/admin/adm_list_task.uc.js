import TaskModel from '../../domain/models/task_model.js';
import logger from '../../core/logger/logger.js';

export const adminListTasksUC = async ({ status } = {}) => {
    logger.debug('adminListTasksUC', { status });
    const filter = {};
    if (status) filter.status = status;
    const docs = await TaskModel.find(filter).sort({ updatedAt: -1 }).lean();
    logger.debug('adminListTasksUC: done', { count: docs.length });
    return docs;
};