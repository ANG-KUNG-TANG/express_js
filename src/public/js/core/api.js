/**
 * api.js — central fetch wrapper with auth header injection and global 401 handling.
 * Usage: import { apiFetch } from './api.js';
 *        const data = await apiFetch('/api/writing-tasks');
 */

export const apiFetch = async (path, options = {}) => {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store',
        Pragma: 'no-cache',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    // cache: 'no-store' prevents the browser from ever caching API responses,
    // which avoids 304 Not Modified responses that have no body and cannot be parsed as JSON.
    const res = await fetch(path, { cache: 'no-store', ...options, headers });

    // ── Global 401: clear session and redirect to login ──
    if (res.status === 401) {
        localStorage.clear();
        window.location.href = '/pages/auth/login.html';
        return;
    }

    // ── 204 No Content ──
    if (res.status === 204) return null;

    // ── Parse JSON ──
    let data;
    try {
        data = await res.json();
    } catch {
        throw new Error('Server returned an invalid response');
    }

    if (!res.ok) {
        const message = data?.message || data?.err || 'Something went wrong';
        throw new Error(message);
    }

    return data;
};