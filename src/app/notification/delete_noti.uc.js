
import { notificationRepo }              from '../../infrastructure/repositories/notification_repo.js';
import { NotificationNotFoundError }     from '../../core/errors/notification.errors.js';
import { redisDel, redisDelPattern, CacheKeys } from '../../core/services/redis.service.js';

/**
 * Delete a single notification that belongs to the requesting user.
 * Ownership check (userId filter in repo) prevents users deleting each other's notifications.
 *
 * @param {string} userId
 * @param {string} notificationId
 */
export const deleteNotiUc = async (userId, notificationId) => {
    const deleted = await notificationRepo.deleteOne(userId, notificationId);

    if (!deleted) {
        throw new NotificationNotFoundError(notificationId);
    }

    // Bust all cached pages + unread count for this user
    await redisDelPattern(`${CacheKeys.userNotifications(userId)}:*`);
    await redisDel(CacheKeys.unreadCount(userId));

    return { deleted: true };
};