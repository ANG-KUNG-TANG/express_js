// api/table/notification.controller.js
// Routes through the existing use-cases so architecture stays consistent.

import { getNotificationsUseCase } from '../../app/notification/get_noti.uc.js';
import { markNotiUc } from '../../app/notification/mark_noti.uc.js';
import { sendSuccess }                  from '../response_formatter.js';
import { HTTP_STATUS }                  from '../http_status.js';

// GET /api/notifications?page=1&limit=15
// Export name matches notification_router.js import
export const getNotifications = async (req, res) => {
    const userId = String(req.user._id ?? req.user.id);
    const page   = Math.max(1, parseInt(req.query.page  ?? 1));
    const limit  = Math.min(50, parseInt(req.query.limit ?? 15));

    const result = await getNotificationsUseCase(userId, { page, limit });
    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// PATCH /api/notifications/read — mark all or a list of IDs as read
// Export name matches notification_router.js import
export const markRead = async (req, res) => {
    const userId = String(req.user._id ?? req.user.id);
    const { ids } = req.body;   // 'all' | string[]

    const result = await markNotiUc(userId, ids ?? 'all');
    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// PATCH /api/notifications/:id/read — mark a single notification as read
export const markOneRead = async (req, res) => {
    const userId = String(req.user._id ?? req.user.id);
    const { id } = req.params;

    const result = await markNotificationsReadUseCase(userId, [id]);
    return sendSuccess(res, result, HTTP_STATUS.OK);
};