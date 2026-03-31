// api/table/notification.controller.js

import { getNotificationsUseCase } from '../../app/notification/get_noti.uc.js';
import { markNotiUc }              from '../../app/notification/mark_noti.uc.js';
import { deleteNotiUc }            from '../../app/notification/delete_noti.uc.js';
import { sendSuccess }             from '../response_formatter.js';
import { HTTP_STATUS }             from '../http_status.js';

// GET /api/notifications?page=1&limit=15
export const getNotifications = async (req, res) => {
    const userId = String(req.user._id ?? req.user.id);
    const page   = Math.max(1, parseInt(req.query.page  ?? 1));
    const limit  = Math.min(50, parseInt(req.query.limit ?? 15));

    const result = await getNotificationsUseCase(userId, { page, limit });
    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// PATCH /api/notifications/read — mark all or a list of IDs as read
// body: { ids: 'all' | string[] }
export const markRead = async (req, res) => {
    const userId = String(req.user._id ?? req.user.id);
    const { ids } = req.body;

    const result = await markNotiUc(userId, ids ?? 'all');
    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// PATCH /api/notifications/:id/read — mark a single notification as read
export const markOneRead = async (req, res) => {
    const userId = String(req.user._id ?? req.user.id);
    const { id } = req.params;

    const result = await markNotiUc(userId, [id]);
    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// DELETE /api/notifications/:id — delete a single notification
export const deleteNotification = async (req, res) => {
    const userId = String(req.user._id ?? req.user.id);
    const { id } = req.params;

    const result = await deleteNotiUc(userId, id);
    return sendSuccess(res, result, HTTP_STATUS.OK);
};