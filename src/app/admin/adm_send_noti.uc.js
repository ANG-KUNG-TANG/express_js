import * as notificationService from '../../core/services/notification.service.js';
import { ValidationError } from '../../core/errors/base.errors.js';
import logger from '../../core/logger/logger.js';

export const admSendNotificationUC = async (params) => {
    logger.debug('admSendNotificationUC: initiating broadcast', { 
        audience: params.audience, 
        senderId: params.senderId 
    });

    // 1. Basic Validation
    if (!params.audience || !params.title || !params.message) {
        throw new ValidationError('Missing required notification fields');
    }

    // 2. Delegate to Service (Handles Audience Resolution + Batch Sending)
    return await notificationService.broadcastAdminNotification(params);
};