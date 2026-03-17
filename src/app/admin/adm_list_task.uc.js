import TaskModel from '../../domain/models/task_model.js';
import logger from '../../core/logger/logger.js';

export const adminListTasksUC = async ({ status, page = 1, limit = 50 } = {}) => {
    logger.debug('adminListTasksUC', { status, page, limit });

    const filter = {};
    if (status) filter.status = status;

    const skip  = (Math.max(1, Number(page)) - 1) * Number(limit);
    const docs  = await TaskModel.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();

    logger.debug('adminListTasksUC: done', { count: docs.length });
    return docs;
};