// src/app/admin/adm_send_notification.uc.js
import { sendNotificationUseCase } from '../notification/send_noti.uc.js';
import { findAll }                 from '../../infrastructure/repositories/user_repo.js';
import logger                      from '../../core/logger/logger.js';

const VALID_AUDIENCES = ['all', 'teachers', 'students', 'individual'];

/**
 * Admin broadcasts a notification to an audience.
 *
 * @param {object} params
 * @param {'all'|'teachers'|'students'|'individual'} params.audience
 * @param {string} [params.targetUserId]  — required when audience === 'individual'
 * @param {string} params.type            — notification type e.g. 'info', 'warning'
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} [params.ctaText]
 * @param {string} [params.ctaUrl]
 * @param {string} params.senderId        — admin's userId (from JWT)
 *
 * @returns {Promise<{ sent: number, failed: number }>}
 */
export const admSendNotificationUC = async ({
    audience,
    targetUserId = null,
    type,
    title,
    message,
    ctaText,
    ctaUrl,
    senderId,
}) => {
    logger.debug('admSendNotificationUC', { audience, type, title, senderId });

    // 1. Resolve recipient user IDs based on audience
    const userIds = await resolveAudience(audience, targetUserId);

    if (!userIds.length) {
        logger.warn('admSendNotificationUC: no recipients found', { audience, targetUserId });
        return { sent: 0, failed: 0 };
    }

    logger.debug('admSendNotificationUC: sending to recipients', { count: userIds.length });

    // 2. Send to each recipient — collect results, never throw on partial failure
    const results = await Promise.allSettled(
        userIds.map((userId) =>
            sendNotificationUseCase({
                userId,
                type,
                title,
                message,
                ctaText,
                ctaUrl,
                metadata: { sentBy: senderId, audience },
            })
        )
    );

    const sent   = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    if (failed > 0) {
        logger.warn('admSendNotificationUC: some notifications failed', { sent, failed });
    }

    logger.debug('admSendNotificationUC: done', { sent, failed });
    return { sent, failed };
};

// ---------------------------------------------------------------------------
// Internal — resolve audience to user ID list
// ---------------------------------------------------------------------------

const resolveAudience = async (audience, targetUserId) => {
    if (!VALID_AUDIENCES.includes(audience)) {
        throw new Error(`Invalid audience: ${audience}. Must be one of: ${VALID_AUDIENCES.join(', ')}`);
    }

    if (audience === 'individual') {
        if (!targetUserId) throw new Error('targetUserId is required for individual audience');
        return [targetUserId];
    }

    // findAll({ role }) — role values match UserRole enum: 'user', 'teacher', 'admin'
    const filter = {};
    if (audience === 'teachers') filter.role = 'teacher';
    if (audience === 'students') filter.role = 'user';   // UserRole.USER — students have role 'user'
    // audience === 'all' → no filter, returns everyone

    const users = await findAll(filter);
    return users.map((u) => u.id ?? u._id?.toString());
};