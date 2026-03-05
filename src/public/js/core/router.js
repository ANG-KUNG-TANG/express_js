/**
 * router.js — client-side route guards.
 * Usage: import { requireAuth } from './router.js';
 *        requireAuth();
 */

import { isLoggedIn, isAdmin } from './auth.js';

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

/** Redirect already-logged-in users away from guest-only pages (login, register). */
export const requireGuest = () => {
    if (isLoggedIn()) {
        window.location.href = '/pages/dashboard.html';
    }
};

/** Pull a query param from the current URL. */
export const getParam = (key) =>
    new URLSearchParams(window.location.search).get(key);