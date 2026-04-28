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
    // ── assignment system ──
    assignTask,
    listStudents,
    getStudentTasks,
    listAssignedTasks,
    // ── new ──
    getStudent,
    getDashboardStats,
    getProfile,
    updateProfile,
} from '../table/teacher.controller.js';
import {
    sanitizeTeacherReview,
    sanitizeUpdateProfile,
} from '../input_sanitizers/teacher.input.sanitizer.js';

const router = Router();

// Every route requires valid JWT + teacher or admin role
router.use(authenticate, requireRole('teacher', 'admin'));

// ── Existing routes ───────────────────────────────────────────────────────────
router.get('/writing-tasks',              asyncHandler(listTasks));
router.get('/writing-tasks/search',       asyncHandler(searchTasks));
router.get('/writing-tasks/:id',          asyncHandler(getTask));
router.patch('/writing-tasks/:id/review', sanitizeTeacherReview, asyncHandler(reviewTask));

// ── Assignment system ─────────────────────────────────────────────────────────
router.post('/assign',                        asyncHandler(assignTask));
router.get('/students',                       asyncHandler(listStudents));
router.get('/students/:studentId/tasks',      asyncHandler(getStudentTasks));
router.get('/assigned-tasks',                 asyncHandler(listAssignedTasks));

// ── New routes ────────────────────────────────────────────────────────────────

// Single student profile — only accessible if the student is assigned to this teacher
router.get('/students/:studentId',            asyncHandler(getStudent));

// Dashboard summary counts
router.get('/dashboard/stats',                asyncHandler(getDashboardStats));

// Teacher's own profile
router.get('/profile',                        asyncHandler(getProfile));
router.patch('/profile',                      sanitizeUpdateProfile, asyncHandler(updateProfile));

export default router;