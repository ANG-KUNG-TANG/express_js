/**
 * router.js — client-side route guards.
 * Usage: import { requireAuth, requireTeacher, requireRole } from './router.js';
 */

import { isAdmin, getUser, getToken } from './auth.js';

export const isTeacher = () => getUser()?.role === 'teacher';

// ── Token validity check ──────────────────────────────────────────────────────
// FIX: isLoggedIn() only checked token existence — expired tokens passed the
// guard, causing API 401s and redirect loops on every protected page.
// Now we decode the JWT exp claim and treat expired tokens as logged out.
const isTokenValid = () => {
    const token = getToken();
    if (!token) return false;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload?.exp && payload.exp * 1000 > Date.now();
    } catch {
        return false;
    }
};

// ── Guards ────────────────────────────────────────────────────────────────────

/** Redirect unauthenticated users to login. */
export const requireAuth = () => {
    if (!isTokenValid()) {
        // Clear stale token so login page doesn't try to redirect back
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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
 * requireRole(...roles) — flexible role guard.
 * e.g. requireRole('teacher', 'admin')
 */
export const requireRole = (...roles) => {
    requireAuth();
    const role = getUser()?.role ?? getUser()?._role ?? '';
    if (!roles.includes(role)) {
        window.location.href = '/pages/dashboard.html';
    }
};

/** Redirect already-logged-in users away from guest-only pages. */
export const requireGuest = () => {
    if (isTokenValid()) {
        // Token is valid — send to correct dashboard
        const user = getUser();
        const role = user?.role ?? '';
        switch (role) {
            case 'admin':   window.location.href = '/pages/admin/dashboard.html'; break;
            case 'teacher': window.location.href = '/pages/teacher/dashboard.html'; break;
            default:        window.location.href = '/pages/dashboard.html';
        }
    }
    // Token missing or expired — stay on guest page (login/register)
};

/** Pull a query param from the current URL. */
export const getParam = (key) =>
    new URLSearchParams(window.location.search).get(key);