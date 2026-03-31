/**
 * js/store/auth.store.js
 *
 * Single source of truth for authentication state.
 * All page files and components read from here — never from localStorage directly.
 *
 * Usage:
 *   import { authStore } from '../store/auth.store.js';
 *
 *   const user  = authStore.getUser();
 *   const token = authStore.getToken();
 *   const role  = authStore.getRole();    // 'admin' | 'teacher' | 'user'
 *   const ok    = authStore.isLoggedIn();
 *
 *   authStore.subscribe((state) => { ... }); // react to changes
 */

const STORAGE_TOKEN = 'token';
const STORAGE_USER  = 'user';

// ── Internal state ────────────────────────────────────────────────────────────
let _state = {
    token: null,
    user:  null,
};

const _listeners = new Set();

const _emit = () => {
    const snapshot = { ..._state, user: _state.user ? { ..._state.user } : null };
    _listeners.forEach(fn => fn(snapshot));
};

// ── Hydrate from localStorage on module load ──────────────────────────────────
// Runs once when the module is first imported on any page.
const _hydrate = () => {
    try {
        const token = localStorage.getItem(STORAGE_TOKEN);
        const raw   = localStorage.getItem(STORAGE_USER);
        const user  = raw ? JSON.parse(raw) : null;
        _state = { token: token ?? null, user: user ?? null };
    } catch {
        _state = { token: null, user: null };
    }
};
_hydrate();

// ── Public API ────────────────────────────────────────────────────────────────

export const authStore = {

    /** Returns the full user object or null. */
    getUser: () => _state.user ? { ..._state.user } : null,

    /** Returns the access token string or null. */
    getToken: () => _state.token,

    /** Returns the user's role string: 'admin' | 'teacher' | 'user' | null. */
    getRole: () => _state.user?.role ?? _state.user?._role ?? null,

    /** True if a token exists in state. */
    isLoggedIn: () => !!_state.token,

    /** True if role === 'admin'. */
    isAdmin: () => authStore.getRole() === 'admin',

    /** True if role === 'teacher' or 'admin'. */
    isTeacher: () => {
        const role = authStore.getRole();
        return role === 'teacher' || role === 'admin';
    },

    /**
     * Save a new token + user after login or token refresh.
     * Writes to localStorage and notifies all subscribers.
     */
    save: (token, user) => {
        _state = { token, user };
        try {
            localStorage.setItem(STORAGE_TOKEN, token);
            localStorage.setItem(STORAGE_USER, JSON.stringify(user));
        } catch { /* storage quota or private mode */ }
        _emit();
    },

    /**
     * Update just the token (called after /auth/refresh).
     * Preserves the existing user object.
     */
    setToken: (token) => {
        _state = { ..._state, token };
        try { localStorage.setItem(STORAGE_TOKEN, token); } catch { }
        _emit();
    },

    /**
     * Update just the user object (called after profile edit).
     * Preserves the existing token.
     */
    setUser: (user) => {
        _state = { ..._state, user };
        try { localStorage.setItem(STORAGE_USER, JSON.stringify(user)); } catch { }
        _emit();
    },

    /**
     * Clear all auth state and localStorage.
     * Call on logout.
     */
    clear: () => {
        _state = { token: null, user: null };
        try { localStorage.removeItem(STORAGE_TOKEN); localStorage.removeItem(STORAGE_USER); } catch { }
        _emit();
    },

    /**
     * Subscribe to state changes.
     * Returns an unsubscribe function.
     *
     * @param {(state: {token, user}) => void} fn
     * @returns {() => void} unsubscribe
     */
    subscribe: (fn) => {
        _listeners.add(fn);
        return () => _listeners.delete(fn);
    },
};