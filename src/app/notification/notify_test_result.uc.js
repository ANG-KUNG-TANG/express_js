// app/notification_uc/notify_test_result.uc.js
// Call this from your score_task.uc.js after scoring is complete

import { sendNotificationUseCase } from './send_noti.uc.js';
import { NotificationType } from '../../domain/entities/notificaiton_entity.js';


export const notifyTestResultUseCase = async (userId, { testName, score, breakdown }) => {
    return sendNotificationUseCase({
        userId,
        type:         NotificationType.TEST_RESULT,
        title:        'Your Test Results Are Ready!',
        message:      `Your ${testName} results are in. Overall band score: ${score}`,
        emailSubject: `📊 ${testName} Results — Band ${score}`,
        ctaText:      'View Full Results',
        ctaUrl:       `${process.env.FRONTEND_URL}/results`,
        metadata:     { testName, score, breakdown },
    });
};