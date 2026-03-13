// interfaces/table/notification.controller.js

// FIX: paths were '/notification/' — correct folder is '/notification_uc/'
import { getNotificationsUseCase } from '../../app/notification/get_noti.uc.js';
import { markNotificationsReadUseCase } from '../../app/notification/mark_noti.uc.js';
import { sanitizeNotificationQueryInput, sanitizeMarkReadInput } from '../input_sanitizers/notification.input_sanitizer.js';
import { sendSuccess } from '../response_formatter.js';
import { HTTP_STATUS } from '../http_status.js';
import logger          from '../../core/logger/logger.js';

// ---------------------------------------------------------------------------
// GET /notifications
// ---------------------------------------------------------------------------

export const getNotifications = async (req, res) => {
    const { page, limit } = sanitizeNotificationQueryInput(req.query);

    logger.debug('notification.getNotifications called', {
        requestId: req.id,
        userId: req.user.id,
        page,
        limit,
    });

    const result = await getNotificationsUseCase(req.user.id, { page, limit });

    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// PATCH /notifications/read
// Body: { ids: ['id1','id2'] } or { ids: 'all' }
// ---------------------------------------------------------------------------

export const markRead = async (req, res) => {
    const { ids } = sanitizeMarkReadInput(req.body);

    logger.debug('notification.markRead called', {
        requestId: req.id,
        userId: req.user.id,
        ids,
    });

    const result = await markNotificationsReadUseCase(req.user.id, ids);

    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// PATCH /notifications/:id/read
// ---------------------------------------------------------------------------

export const markOneRead = async (req, res) => {
    const { id } = req.params;

    logger.debug('notification.markOneRead called', {
        requestId: req.id,
        userId: req.user.id,
        notificationId: id,
    });

    const result = await markNotificationsReadUseCase(req.user.id, [id]);

    return sendSuccess(res, result, HTTP_STATUS.OK);
};