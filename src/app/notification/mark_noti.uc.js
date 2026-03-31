// app/notification/mark_noti.uc.js

import { notificationRepo }                  from '../../infrastructure/repositories/notification_repo.js';
import { NotificationNotFoundError }          from '../../core/errors/notification.errors.js';
import { redisDel, redisDelPattern, CacheKeys } from '../../core/services/redis.service.js';

/**
 * Mark one, many, or all notifications as read for a user.
 *
 * @param {string}         userId
 * @param {string[]|'all'} ids   — array of notification IDs, or the string 'all'
 */
export const markNotiUc = async (userId, ids) => {
    if (ids !== 'all' && (!Array.isArray(ids) || ids.length === 0)) {
        throw new NotificationNotFoundError('(none provided)');
    }

    // ── 1. Update DB ──────────────────────────────────────────────────────────
    const updatedCount = await notificationRepo.markRead(userId, ids);

    // ── 2. Bust Redis cache ───────────────────────────────────────────────────
    // Delete ALL cached pages for this user's notification list because
    // unread counts are embedded in each page's response.
    // redisDelPattern handles the wildcard safely using SCAN (no KEYS command).
    await redisDelPattern(`${CacheKeys.userNotifications(userId)}:*`);
    await redisDel(CacheKeys.unreadCount(userId));

    return { updatedCount };
};