/**
 * auth-guard.js — role-based page protection.
 *
 * This file consolidates auth-guard functionality.
 * router.js already has this logic — we re-export from there so both
 * import paths work:
 *   import { requireAuth } from '../../core/router.js';       ← existing pages
 *   import { requireAuth } from '../../core/auth-guard.js';   ← new pages
 *
 * Usage:
 *   requireAuth()              — any logged-in user
 *   requireRole('teacher')     — teacher or admin
 *   requireRole('admin')       — admin only
 *   requireGuest()             — redirect logged-in users away from login page
 */

export {
    requireAuth,
    requireAdmin,
    requireTeacher,
    requireRole,
    requireGuest,
    getParam,
    isTeacher,
} from './router.js';