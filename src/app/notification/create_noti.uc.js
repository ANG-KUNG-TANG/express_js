// app/notification/create_noti.uc.js
//
// Thin wrapper around sendNotificationUseCase specifically for TASK_ASSIGNED
// notifications triggered directly (e.g. from teacher_assign_task.uc.js before
// the NotificationService was introduced, or from tests).
//
// notification.service.js no longer calls this file — it calls sendNotificationUseCase
// directly so it can handle all notification types generically.
//
// Keep this file for:
//   - Backwards compatibility with any direct callers outside the service
//   - Rich TASK_ASSIGNED messages with due-date formatting and CTA URLs
//
// ── Usage ─────────────────────────────────────────────────────────────────────
//
//   import { createTaskAssignedNotificationUC } from './create_noti.uc.js';
//
//   await createTaskAssignedNotificationUC({
//       studentId:   '...',
//       teacherName: 'Ms. Smith',
//       taskId:      '...',
//       taskTitle:   'IELTS Task 2 — Environment',
//       dueDate:     '2025-06-01T00:00:00Z',   // optional
//   });

import { sendNotificationUseCase } from './send_noti.uc.js';
import { NotificationType }        from '../../domain/entities/notificaiton_entity.js';

/**
 * @param {object} params
 * @param {string} params.studentId   - recipient user ID
 * @param {string} params.teacherName - teacher's display name
 * @param {string} params.taskId      - assigned task's _id
 * @param {string} params.taskTitle   - task title shown in the notification body
 * @param {string} [params.dueDate]   - ISO date string (optional)
 */
export const createTaskAssignedNotificationUC = async ({
    studentId,
    teacherName,
    taskId,
    taskTitle,
    dueDate,
}) => {
    const dueTxt = dueDate
        ? ` Due: ${new Date(dueDate).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
          })}.`
        : '';

    return sendNotificationUseCase({
        userId:       studentId,
        type:         NotificationType.TASK_ASSIGNED,
        title:        'New task assigned',
        message:      `${teacherName} assigned you "${taskTitle}".${dueTxt}`,
        emailSubject: `New task: "${taskTitle}"`,
        ctaText:      'View task',
        ctaUrl:       `${process.env.FRONTEND_URL}/pages/tasks/detail.html?id=${taskId}`,
        metadata:     { taskId, teacherName, dueDate: dueDate ?? null },
    });
};