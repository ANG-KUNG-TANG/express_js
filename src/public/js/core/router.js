/**
 * router.js — client-side route guards.
 * Usage: import { requireAuth, requireTeacher, requireRole } from './router.js';
 */

import { isLoggedIn, isAdmin, getUser, getToken } from './auth.js';

export const isTeacher = () => getUser()?.role === 'teacher';

/** Redirect unauthenticated users to login. */
export const requireAuth = () => {
    if (!isLoggedIn()) {
        window.location.href = '/pages/auth/login.html';
    }
};

/** Redirect non-admins away from admin pages. */
export const requireAdmin = () => {
    requireAuth();
    if (!isAdmin()) {
        window.location.href = '/pages/dashboard.html';
    }
};

/** Redirect non-teachers (and non-admins) away from teacher pages. */
export const requireTeacher = () => {
    requireAuth();
    if (!isTeacher() && !isAdmin()) {
        window.location.href = '/pages/dashboard.html';
    }
};

/**
 * requireRole(...roles) — flexible role guard used by teacher pages.
 * e.g. requireRole('teacher', 'admin')
 * Redirects to dashboard if the current user's role is not in the allowed list.
 */
export const requireRole = (...roles) => {
    requireAuth();
    const role = getUser()?.role ?? getUser()?._role ?? '';
    if (!roles.includes(role)) {
        window.location.href = '/pages/dashboard.html';
    }
};

/** Redirect already-logged-in users away from guest-only pages. */
export function requireGuest() {
    const token = getToken();
    if (token) {
        window.location.href = '/pages/dashboard.html';
    }
}

/** Pull a query param from the current URL. */
export const getParam = (key) =>
    new URLSearchParams(window.location.search).get(key);