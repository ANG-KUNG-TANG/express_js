/**
 * task_reminder.job.js
 *
 * Two cron jobs using your exact repo function names and WritingStatus enum:
 *
 *   1. Due-soon reminder (every hour)
 *      findDueSoon() → tasks accepted + dueDate within 24h + not yet submitted
 *
 *   2. Unstarted nudge (daily 09:00 UTC)
 *      findUnstarted() → tasks accepted but status still ASSIGNED after 3 days
 *      NOTE: uses WritingStatus.ASSIGNED (= never started) not 'PENDING'
 *
 * Call startReminderJobs() once from server.js after DB connects.
 */

import cron from 'node-cron';
import {
    findDueSoon,
    findUnstarted,
    markReminderSent,
    markUnstartedNotiSent,
} from '../../infrastructure/repositories/task_repo.js';
import { sendNotificationUseCase } from '../../app/notification/send_noti.uc.js';
import { NotificationType } from '../../domain/entities/notificaiton_entity.js';
import logger from '../logger/logger.js';

const REMINDER_HOURS = 24;
const UNSTARTED_DAYS = 3;

// ── Job 1: due-soon reminder ──────────────────────────────────────────────────
async function runDueSoonReminders() {
    logger.info('[ReminderJob] Running due-soon check...');
    try {
        const tasks = await findDueSoon(REMINDER_HOURS);
        logger.info(`[ReminderJob] ${tasks.length} tasks due soon`);

        for (const task of tasks) {
            try {
                const hoursLeft = Math.round(
                    (new Date(task._dueDate) - new Date()) / (1000 * 60 * 60)
                );
                await sendNotificationUseCase({
                    userId:  task._assignedTo,
                    type:    NotificationType.TASK_REMINDER,
                    title:   'Task due soon',
                    message: `Reminder: "${task._title}" is due in ~${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`,
                    metadata: {
                        taskId:    task._id,
                        dueDate:   task._dueDate,
                        hoursLeft,
                    },
                });
                await markReminderSent(task._id);
                logger.info(`[ReminderJob] TASK_REMINDER sent → task ${task._id}`);
            } catch (err) {
                logger.error(`[ReminderJob] Failed for task ${task._id}: ${err.message}`);
            }
        }
    } catch (err) {
        logger.error(`[ReminderJob] Due-soon job error: ${err.message}`);
    }
}

// ── Job 2: unstarted nudge ────────────────────────────────────────────────────
async function runUnstartedReminders() {
    logger.info('[UnstartedJob] Running unstarted check...');
    try {
        const tasks = await findUnstarted(UNSTARTED_DAYS);
        logger.info(`[UnstartedJob] ${tasks.length} unstarted tasks`);

        for (const task of tasks) {
            try {
                const daysSince = Math.floor(
                    (new Date() - new Date(task._createdAt)) / (1000 * 60 * 60 * 24)
                );
                await sendNotificationUseCase({
                    userId:  task._assignedTo,
                    type:    NotificationType.TASK_UNSTARTED,
                    title:   'Task not started yet',
                    message: `You haven't started "${task._title}" yet — assigned ${daysSince} day${daysSince !== 1 ? 's' : ''} ago`,
                    metadata: {
                        taskId:           task._id,
                        daysSinceAssigned: daysSince,
                        dueDate:          task._dueDate ?? null,
                    },
                });
                await markUnstartedNotiSent(task._id);
                logger.info(`[UnstartedJob] TASK_UNSTARTED sent → task ${task._id}`);
            } catch (err) {
                logger.error(`[UnstartedJob] Failed for task ${task._id}: ${err.message}`);
            }
        }
    } catch (err) {
        logger.error(`[UnstartedJob] Unstarted job error: ${err.message}`);
    }
}

// ── Start ─────────────────────────────────────────────────────────────────────
export function startReminderJobs() {
    cron.schedule('0 * * * *',  runDueSoonReminders,   { timezone: 'UTC' });
    cron.schedule('0 9 * * *',  runUnstartedReminders, { timezone: 'UTC' });
    logger.info('[Jobs] Task reminder cron jobs started');
}

// Allow manual trigger in dev
export { runDueSoonReminders, runUnstartedReminders };