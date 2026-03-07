// app/notification_uc/get_notifications.uc.js
import { notificationRepo } from '../../infrastructure/repositories/notification_repo.js';

export const getNotificationsUseCase = async (userId, { page = 1, limit = 20 } = {}) => {
    const { notifications, total } = await notificationRepo.findByUserId(userId, { page, limit });
    const unreadCount = await notificationRepo.countUnread(userId);

    return {
        notifications,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        unreadCount,
    };
};