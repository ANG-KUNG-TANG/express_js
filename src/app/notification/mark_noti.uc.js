// app/notification_uc/mark_notifications_read.uc.js
import { notificationRepo }         from '../../infrastructure/repositories/notification_repo.js';
import { NotificationNotFoundError } from '../../core/errors/notification.errors.js';

/**
 * @param {string}          userId
 * @param {string[]|'all'}  ids
 */
export const markNotiUc = async (userId, ids) => {
    if (ids !== 'all' && (!Array.isArray(ids) || ids.length === 0)) {
        throw new NotificationNotFoundError('(none provided)');
    }
    const updatedCount = await notificationRepo.markRead(userId, ids);
    return { updatedCount };
};