// core/job/task_remainder.job.js
//
//   Job 1: due-soon reminder  — every hour
//          findDueSoon() → tasks accepted + dueDate within 24h + not yet submitted
//
//   Job 2: unstarted nudge    — daily 09:00 UTC
//          findUnstarted() → accepted tasks still ASSIGNED after 3 days (never started)
//
// Call startReminderJobs() once from server.js after DB connects.

import cron from 'node-cron';
import {
    findDueSoon,
    findUnstarted,
    markReminderSent,
    markUnstartedNotiSent,
} from '../../infrastructure/repositories/task_repo.js';
import { NotificationService } from '../services/notification.service.js';
import logger                  from '../logger/logger.js';

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

                // No actorId — system-generated notification
                await NotificationService.send({
                    recipientId: String(task._assignedTo ?? task._userId),
                    type:        NotificationService.TYPES.TASK_REMINDER,
                    title:       'Task due soon',
                    message:     `"${task._title}" is due in ~${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`,
                    refId:       String(task._id),
                    refModel:    'Task',
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

                await NotificationService.send({
                    recipientId: String(task._assignedTo ?? task._userId),
                    type:        NotificationService.TYPES.TASK_REMINDER,
                    title:       'Task not started yet',
                    message:     `You haven't started "${task._title}" yet — assigned ${daysSince} day${daysSince !== 1 ? 's' : ''} ago`,
                    refId:       String(task._id),
                    refModel:    'Task',
                });

                await markUnstartedNotiSent(task._id);
                logger.info(`[UnstartedJob] TASK_REMINDER sent → task ${task._id}`);
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
    cron.schedule('0 * * * *', runDueSoonReminders,   { timezone: 'UTC' });
    cron.schedule('0 9 * * *', runUnstartedReminders, { timezone: 'UTC' });
    logger.info('[Jobs] Task reminder cron jobs started');
}

// Allow manual trigger in dev/testing
export { runDueSoonReminders, runUnstartedReminders };