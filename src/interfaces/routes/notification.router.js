import { Router }       from 'express';
import { asyncHandler } from '../async_handler.js';
import { authenticate } from '../../middleware/authenticate.middelware.js';
import {
    getNotifications,
    markRead,
    markOneRead,
    deleteNotification,
} from '../table/notification.controller.js';

export const notificationRouter = Router();

// All notification routes require a valid JWT
// Auth is declared here — do NOT rely on the mount site to add it.
notificationRouter.use(authenticate);

notificationRouter.get   ('/',          asyncHandler(getNotifications));
notificationRouter.patch ('/read',      asyncHandler(markRead));          // mark all read
notificationRouter.patch ('/:id/read',  asyncHandler(markOneRead));       // mark one read
notificationRouter.delete('/:id',       asyncHandler(deleteNotification));