import { Router } from 'express';
import { asyncHandler } from '../async_handler.js';
import { authenticate, authorizeAdmin } from '../../middleware/auth.middelware.js';
import {
    createWritingTaskController,
    getWritingTaskByIdController,
    listWritingTaskController,
    searchWritingTaskController,
    updateWritingTaskController,
    deleteWritingTaskController,
    startWritingTaskController,
    submitTaskController,
    reviewTaskController,
    scoreTaskController,
    transferWritingTaskController,
} from './task.controller.js';

const router = Router();

router.use(authenticate);

// ── Static routes FIRST (before /:id to avoid param collision) ────────────────
router.post('/transfer', authorizeAdmin, asyncHandler(transferWritingTaskController));
router.get('/search',                   asyncHandler(searchWritingTaskController));

// ── Collection ────────────────────────────────────────────────────────────────
router.post('/',  asyncHandler(createWritingTaskController));
router.get('/',   asyncHandler(listWritingTaskController));

// ── Single resource ───────────────────────────────────────────────────────────
router.get('/:id',             asyncHandler(getWritingTaskByIdController));
router.patch('/:id/start',     asyncHandler(startWritingTaskController));
router.patch('/:id/submit',    asyncHandler(submitTaskController));
router.patch('/:id/review',    authorizeAdmin, asyncHandler(reviewTaskController));
router.patch('/:id/score',     authorizeAdmin, asyncHandler(scoreTaskController));
router.patch('/:id',           asyncHandler(updateWritingTaskController));
router.delete('/:id',          asyncHandler(deleteWritingTaskController));

export default router;