// app/notification_uc/create_noti.uc.js
//
// Convenience wrapper used by teacherAssignTaskUC (and anywhere else a
// TASK_ASSIGNED notification is needed).
// All other notification types have their own dedicated UC
// (notify_test_result, notify_task_reminder, etc.) — this one handles
// the assignment flow specifically.

import { sendNotificationUseCase } from './send_noti.uc.js';
import { NotificationType }        from '../../domain/entities/notificaiton_entity.js';

/**
 * @param {object} params
 * @param {string} params.studentId   - recipient user ID
 * @param {string} params.teacherName - teacher's display name
 * @param {string} params.taskId      - assigned task's ID
 * @param {string} params.taskTitle   - task title shown in the notification
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
        type:         NotificationType.TASK_ASSIGNED,       // 'task_assigned'
        title:        'New Task Assigned',
        message:      `${teacherName} assigned you "${taskTitle}".${dueTxt}`,
        emailSubject: `📋 New task: "${taskTitle}"`,
        ctaText:      'View Task',
        ctaUrl:       `${process.env.FRONTEND_URL}/pages/tasks/detail.html?id=${taskId}`,
        metadata:     { taskId, teacherName, dueDate: dueDate ?? null },
    });
};