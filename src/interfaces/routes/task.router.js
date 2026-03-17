import { Router } from 'express';
import { asyncHandler } from '../async_handler.js';
import { authenticate, authorizeAdmin } from '../../middleware/auth.middelware.js';
import { requireRole } from '../../middleware/role.middleware.js';
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
    lookupVocabController,
    respondAssignmentController,           // ← new
} from '../table/task.controller.js';

const router = Router();

router.use(authenticate);

// ── Static routes FIRST (before /:id to avoid param collision) ────────────────
router.post('/transfer', authorizeAdmin, asyncHandler(transferWritingTaskController));
router.get('/search',                   asyncHandler(searchWritingTaskController));

// ── Vocabulary lookup ─────────────────────────────────────────────────────────
router.get('/vocab/:word',              asyncHandler(lookupVocabController));

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

// ── Assignment response (new) ─────────────────────────────────────────────────
// Student accepts or declines a teacher-assigned task
// Must be AFTER /:id routes to avoid conflicts, uses full :taskId param name
// No role restriction needed — respondAssignmentUC enforces task ownership.
// 'user' is the default role (UserRole.USER); 'student' is an alias some setups use.
router.post('/:taskId/respond-assignment',
    requireRole('user', 'student'),
    asyncHandler(respondAssignmentController)
);

export default router;