import { Router }       from 'express';
import { asyncHandler } from '../async_handler.js';
import { authenticate, authorizeAdmin } from '../../middleware/authenticate.middelware.js';
import { requireRole }  from '../../middleware/role.middleware.js';
import {aiEvaluationRateLimit} from '../../middleware/rate_limit.middleware.js';
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
    respondAssignmentController,
    aiCheckTaskController,              
} from '../table/task.controller.js';


const router = Router();

router.use(authenticate);

// ── Static routes FIRST (before /:id to avoid param collision) ───────────────
router.post('/transfer', authorizeAdmin, asyncHandler(transferWritingTaskController));
router.get ('/search',                  asyncHandler(searchWritingTaskController));

// ── Vocabulary lookup ─────────────────────────────────────────────────────────
router.get('/vocab/:word',              asyncHandler(lookupVocabController));

// ── Collection ────────────────────────────────────────────────────────────────
router.post('/',  asyncHandler(createWritingTaskController));
router.get ('/',  asyncHandler(listWritingTaskController));

// ── Single resource ───────────────────────────────────────────────────────────
router.get   ('/:id',          asyncHandler(getWritingTaskByIdController));
router.patch ('/:id/start',    asyncHandler(startWritingTaskController));
router.patch ('/:id/submit',   asyncHandler(submitTaskController));
router.patch ('/:id/review',   authorizeAdmin, asyncHandler(reviewTaskController));
router.patch ('/:id/score',    authorizeAdmin, asyncHandler(scoreTaskController));
router.patch ('/:id',          asyncHandler(updateWritingTaskController));
router.delete('/:id',          asyncHandler(deleteWritingTaskController));

// ── AI check ──────────────────────────────────────────────────────────────────
// Only available AFTER submission (SUBMITTED / REVIEWED / SCORED).
// Blocked while status is ASSIGNED or WRITING — enforced in evaluateWritingUC.
// Rate limited to 5 checks per user per UTC day — enforced in controller.
// Does NOT affect teacher's bandScore or feedback.
router.post('/:id/ai-check',
    requireRole('user', 'student'),
    aiEvaluationRateLimit,           
    asyncHandler(aiCheckTaskController),
);

// ── Assignment response ───────────────────────────────────────────────────────
// Student accepts or declines a teacher-assigned task.
// Must be AFTER /:id routes — uses full :taskId param name.
router.post('/:taskId/respond-assignment',
    requireRole('user', 'student'),
    asyncHandler(respondAssignmentController),
);


export default router;