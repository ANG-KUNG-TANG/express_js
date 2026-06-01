// src/core/services/content_flag_service.js

import * as contentFlagRepo from '../../infrastructure/repositories/content_flag_repo.js';

export const createFlag = async (flaggedBy, { taskId, taskTitle, reason, severity }) => {
    return await contentFlagRepo.createFlag({ taskId, taskTitle, flaggedBy, reason, severity });
};

export const resolveFlag = async (flagId, resolvedBy) => {
    return await contentFlagRepo.resolveFlag(flagId, resolvedBy);
};

export const deleteFlag = async (flagId) => {
    return await contentFlagRepo.deleteFlag(flagId);
};

export const getFlagById = async (flagId) => {
    return await contentFlagRepo.findFlagById(flagId);
};

export const getFlags = async (options = {}) => {
    return await contentFlagRepo.findFlags(options);
};

export const getOpenFlags = async (options = {}) => {
    return await contentFlagRepo.findOpenFlags(options);
};

export const getFlagsByTask = async (taskId, options = {}) => {
    return await contentFlagRepo.findFlagsByTask(taskId, options);
};

export const getFlagStats = async () => {
    const [byStatus, bySeverity] = await Promise.all([
        contentFlagRepo.countFlagsByStatus(),
        contentFlagRepo.countFlagsBySeverity(),
    ]);
    return { byStatus, bySeverity };
};