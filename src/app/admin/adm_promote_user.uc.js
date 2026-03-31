// app/admin/adm_promote_user.uc.js

import { promoteToAdmin, sanitizeUser } from '../../infrastructure/repositories/user_repo.js';
import { NotificationService }                        from '../../core/services/notification.service.js';
import logger                                         from '../../core/logger/logger.js';

export const adminPromoteUserUC = async (adminId, userId) => {
    logger.debug('adminPromoteUserUC', { userId });

    const user = await promoteToAdmin(userId);

    // Notify the promoted user — fire-and-forget
    NotificationService.send({
        recipientId: userId,
        actorId:     adminId,
        type:        NotificationService.TYPES.ROLE_CHANGED,
        title:       'Your role has been updated',
        message:     `Your account has been promoted to ${user._role ?? 'a new role'}`,
        refId:       userId,
        refModel:    'User',
    });

    return sanitizeUser(user);
};