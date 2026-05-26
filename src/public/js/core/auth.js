/**
 * auth.js — session helpers
 */

import { apiFetch }       from './api.js';
import { disconnectSocket } from './socket.js';

// ── Session helpers ───────────────────────────────────────────────────────────
export const getUser   = () => JSON.parse(localStorage.getItem('user') || 'null');
export const getToken  = () => localStorage.getItem('token');
export const isAdmin   = () => getUser()?.role === 'admin';
export const isTeacher = () => getUser()?.role === 'teacher';

// FIX: isLoggedIn now checks token expiry, not just existence.
// An expired token in localStorage must be treated as logged out —
// otherwise protected pages pass the guard and immediately get 401s.
export const isLoggedIn = () => {
    const token = getToken();
    if (!token) return false;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload?.exp && payload.exp * 1000 > Date.now();
    } catch {
        return false;
    }
};

export const saveSession = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    // Socket is initialised by the page — do NOT call initSocket() here
    // to avoid double-connecting.
};

export const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

// ── Logout ────────────────────────────────────────────────────────────────────
// Calls the server to revoke the refresh token + clear cookies.
// Session is cleared locally regardless of server response.
export const logOut = async () => {
    try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
        // Server revoke failed (expired token, network error) — clear locally anyway
    } finally {
        disconnectSocket();
        clearSession();
        window.location.href = '/pages/auth/login.html';
    }
};