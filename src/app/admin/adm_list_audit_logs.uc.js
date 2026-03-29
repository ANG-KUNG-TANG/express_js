// src/app/admin/adm_list_audit_logs.uc.js
import { findLogs } from '../../infrastructure/repositories/audit_log_repo.js';
import logger from '../../core/logger/logger.js';

/**
 * Admin queries the persisted audit log.
 *
 * @param {object}  options
 * @param {string}  [options.action]
 * @param {string}  [options.requesterId]
 * @param {string}  [options.outcome]      'success' | 'failure'
 * @param {string}  [options.from]         ISO date string
 * @param {string}  [options.to]           ISO date string
 * @param {number}  [options.page]
 * @param {number}  [options.limit]
 * @returns {Promise<{ logs, total, page, limit, pages }>}
 */
export const admListAuditLogsUC = async (options = {}) => {
    logger.debug('admListAuditLogsUC', { options });
    return await findLogs(options);
};