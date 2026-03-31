// interfaces/routes/notification.router.js
// Mount with your authenticate middleware:
//   app.use('/notifications', authenticate, notificationRouter)

import { Router }       from 'express';
import { asyncHandler } from '../async_handler.js';
import {
    getNotifications,
    markRead,
    markOneRead,
    deleteNotification
} from '../table/notification.controller.js';

// FIX: Router() must be called BEFORE the routes are registered on it
export const notificationRouter = Router();

notificationRouter.get ('/',          asyncHandler(getNotifications));
notificationRouter.patch('/read',     asyncHandler(markRead));
notificationRouter.patch('/:id/read', asyncHandler(markOneRead));
notificationRouter.delete('/:id', asyncHandler(deleteNotification));