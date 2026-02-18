import { Router } from 'express';
import { asyncHandler } from '../async_handler.js';
import { authenticate, authorizeAdmin } from '../../middleware/auth.middelware.js';
import {
    createTaskController,
    getTaskByIdController,
    listTaskController,
    searchTaskController,
    updateTaskController,
    deleteTaskController,
    startTaskController,
    completeTaskController,
    transferTaskController,
} from './task.controller.js';

const router = Router();

router.use(authenticate);  // ← this is what sets req.user on every request

router.post('/',              asyncHandler(createTaskController));
router.get('/search',         asyncHandler(searchTaskController));
router.get('/',               asyncHandler(listTaskController));
router.get('/:id',            asyncHandler(getTaskByIdController));
router.patch('/:id',          asyncHandler(updateTaskController));
router.delete('/:id',         asyncHandler(deleteTaskController));
router.patch('/:id/start',    asyncHandler(startTaskController));
router.patch('/:id/complete', asyncHandler(completeTaskController));
router.post('/transfer',      authorizeAdmin, asyncHandler(transferTaskController));

export default router;
