// interfaces/routes/notification.router.js
// Mount with your authenticate middleware:
//   app.use('/notifications', authenticate, notificationRouter)

import { Router }       from 'express';
import { asyncHandler } from '../async_handler.js';
import {
    getNotifications,
    markRead,
    markOneRead,
} from '../table/notification.controller.js';

export const notificationRouter = Router();

notificationRouter.get ('/',          asyncHandler(getNotifications));
notificationRouter.patch('/read',     asyncHandler(markRead));
notificationRouter.patch('/:id/read', asyncHandler(markOneRead));