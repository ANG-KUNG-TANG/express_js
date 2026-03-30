// src/app/admin/adm_list_flags.uc.js
import { findFlags } from '../../infrastructure/repositories/content_flag_repo.js';
import logger        from '../../core/logger/logger.js';

/**
 * Admin lists content flags with optional filters.
 *
 * @param {object}                      options
 * @param {'open'|'resolved'}           [options.status]
 * @param {'low'|'medium'|'high'}       [options.severity]
 * @param {string}                      [options.taskId]
 * @param {string}                      [options.flaggedBy]
 * @param {number}                      [options.page]
 * @param {number}                      [options.limit]
 * @returns {Promise<ContentFlag[]>}
 */
export const admListFlagsUC = async (options = {}) => {
    logger.debug('admListFlagsUC', { options });
    return findFlags(options);
};