// app/notification_uc/notify_exam_reminder.uc.js
// Call this from a scheduler or whenever an exam is confirmed

import { sendNotificationUseCase } from './send_noti.uc.js';
import { NotificationType } from '../../domain/entities/notificaiton_entity.js';


export const notifyExamReminderUseCase = async (userId, { examName, examDate, location }) => {
    const dateStr = new Date(examDate).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    return sendNotificationUseCase({
        userId,
        type:         NotificationType.EXAM_REMINDER,
        title:        `Reminder: ${examName} is coming up`,
        message:      `Your exam "${examName}" is scheduled for ${dateStr}.${location ? ` Location: ${location}` : ''}`,
        emailSubject: `⏰ Exam Reminder: ${examName} — ${dateStr}`,
        ctaText:      'View Exam Details',
        ctaUrl:       `${process.env.FRONTEND_URL}/exams`,
        metadata:     { examName, examDate, location },
    });
};