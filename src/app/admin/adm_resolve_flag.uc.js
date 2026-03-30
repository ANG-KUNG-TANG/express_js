// src/app/admin/adm_resolve_flag.uc.js
import { resolveFlag } from '../../infrastructure/repositories/content_flag_repo.js';
import logger          from '../../core/logger/logger.js';

/**
 * Admin marks a content flag as resolved.
 *
 * Throws ContentFlagNotFoundError      if the flag doesn't exist.
 * Throws ContentFlagAlreadyResolvedError if it's already been resolved.
 *
 * @param {string} adminId  — the admin's userId (from JWT)
 * @param {string} flagId   — flag to resolve
 * @returns {Promise<ContentFlag>}
 */
export const admResolveFlagUC = async (adminId, flagId) => {
    logger.debug('admResolveFlagUC', { adminId, flagId });

    const flag = await resolveFlag(flagId, adminId);

    logger.debug('admResolveFlagUC: flag resolved', { flagId });
    return flag;
};