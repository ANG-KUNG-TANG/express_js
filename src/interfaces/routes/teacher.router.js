import { Router }       from 'express';
import { asyncHandler } from '../async_handler.js';
import { authenticate } from '../../middleware/auth.middelware.js';
import { requireRole }  from '../../middleware/role.middleware.js';
import {
    listTasks,
    searchTasks,
    getTask,
    reviewTask,
} from '../table/teacher.controller.js';
import { sanitizeTeacherReview } from '../input_sanitizers/teacher.input.sanitizer.js';

const router = Router();

// Every route under /api/teacher requires a valid JWT + teacher OR admin role
// Admins can also access teacher routes (they outrank teachers)
router.use(authenticate, requireRole('teacher', 'admin'));

// ── Writing Tasks ──────────────────────────────────────────────────────────
router.get('/writing-tasks',              asyncHandler(listTasks));
router.get('/writing-tasks/search',       asyncHandler(searchTasks));
router.get('/writing-tasks/:id',          asyncHandler(getTask));
router.patch('/writing-tasks/:id/review', sanitizeTeacherReview, asyncHandler(reviewTask));

export default router;