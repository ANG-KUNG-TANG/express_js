// app/notification/get_noti.uc.js

import { notificationRepo }                        from '../../infrastructure/repositories/notification_repo.js';
import { redisGet, redisSet, CacheKeys, TTL }      from '../../core/services/redis.service.js';

export const getNotificationsUseCase = async (userId, { page = 1, limit = 20 } = {}) => {
    // Cache key includes page + limit so different pages never share a cache entry
    const cacheKey = `${CacheKeys.userNotifications(userId)}:p${page}:l${limit}`;

    // ── 1. Check cache ────────────────────────────────────────────────────────
    const cached = await redisGet(cacheKey);
    if (cached) return cached;

    // ── 2. Cache miss — fetch from DB ─────────────────────────────────────────
    const { notifications, total } = await notificationRepo.findByUserId(userId, { page, limit });
    const unreadCount = await notificationRepo.countUnread(userId);

    const result = {
        notifications: notifications.map((n) => n.toJSON()),
        total,
        page,
        totalPages: Math.ceil(total / limit),
        unreadCount,
    };

    // ── 3. Store in cache ─────────────────────────────────────────────────────
    // TTL.NOTIFICATIONS is short (60s) — notification.service.js busts this
    // cache on every new notification so freshness is always maintained.
    await redisSet(cacheKey, result, TTL.NOTIFICATIONS);

    return result;
};