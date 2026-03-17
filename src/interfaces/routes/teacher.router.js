import { Router }       from 'express';
import { asyncHandler } from '../async_handler.js';
import { authenticate } from '../../middleware/auth.middelware.js';
import { requireRole }  from '../../middleware/role.middleware.js';
import {
    // ── existing ──
    listTasks,
    searchTasks,
    getTask,
    reviewTask,
    // ── new ──
    assignTask,
    listStudents,
    getStudentTasks,
    listAssignedTasks,
} from '../table/teacher.controller.js';
import { sanitizeTeacherReview } from '../input_sanitizers/teacher.input.sanitizer.js';

const router = Router();

// Every route requires valid JWT + teacher or admin role (unchanged)
router.use(authenticate, requireRole('teacher', 'admin'));

// ── Existing routes — untouched ───────────────────────────────────────────────
router.get('/writing-tasks',              asyncHandler(listTasks));
router.get('/writing-tasks/search',       asyncHandler(searchTasks));
router.get('/writing-tasks/:id',          asyncHandler(getTask));
router.patch('/writing-tasks/:id/review', sanitizeTeacherReview, asyncHandler(reviewTask));

// ── New routes — assignment system ────────────────────────────────────────────

// Assign a task to a student (all 3 modes: teacher_new / teacher_existing / teacher_topic)
router.post('/assign',                        asyncHandler(assignTask));

// List all students belonging to this teacher (optionally with task stats)
router.get('/students',                       asyncHandler(listStudents));

// All tasks assigned to a specific student by this teacher
router.get('/students/:studentId/tasks',      asyncHandler(getStudentTasks));

// All tasks this teacher has assigned (across all students)
router.get('/assigned-tasks',                 asyncHandler(listAssignedTasks));

export default router;