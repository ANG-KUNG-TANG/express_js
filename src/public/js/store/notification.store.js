/**
 * js/store/notification.store.js
 *
 * Single source of truth for notification state.
 * The socket listener, REST poll, bell badge, dropdown panel,
 * and toast all read from and write to this store.
 * Components subscribe to changes — they never call notificationAPI directly.
 *
 * Usage:
 *   import { notificationStore } from '../store/notification.store.js';
 *
 *   // Load initial data (call once per page after login)
 *   await notificationStore.load();
 *
 *   // Subscribe to state changes (bell badge, dropdown re-render)
 *   const unsub = notificationStore.subscribe(({ notifications, unreadCount }) => {
 *       badge.textContent = unreadCount;
 *   });
 *
 *   // Called by socket.js when 'noti:new' fires
 *   notificationStore.addNew(notification);
 */

import { notificationAPI } from '../core/api.js';

// ── Internal state ────────────────────────────────────────────────────────────
let _state = {
    notifications: [],
    unreadCount:   0,
    page:          1,
    totalPages:    1,
    loading:       false,
    error:         null,
};

const _listeners = new Set();

const _emit = () => {
    const snapshot = { ..._state, notifications: [..._state.notifications] };
    _listeners.forEach(fn => fn(snapshot));
};

// ── Public API ────────────────────────────────────────────────────────────────

export const notificationStore = {

    /** Returns a snapshot of current state. */
    getState: () => ({ ..._state, notifications: [..._state.notifications] }),

    /**
     * Subscribe to state changes.
     * Immediately calls fn with current state, then on every change.
     * Returns an unsubscribe function.
     */
    subscribe: (fn) => {
        _listeners.add(fn);
        fn({ ..._state, notifications: [..._state.notifications] }); // immediate
        return () => _listeners.delete(fn);
    },

    /**
     * Fetch the first page of notifications from the API.
     * Called once per page on load.
     */
    load: async (page = 1, limit = 20) => {
        _state = { ..._state, loading: true, error: null };
        _emit();
        try {
            const res  = await notificationAPI.getAll(page, limit);
            const data = res?.data ?? res ?? {};

            _state = {
                ..._state,
                notifications: data.notifications ?? [],
                unreadCount:   data.unreadCount   ?? 0,
                page:          data.page          ?? 1,
                totalPages:    data.totalPages     ?? 1,
                loading:       false,
                error:         null,
            };
        } catch (err) {
            _state = { ..._state, loading: false, error: err.message };
        }
        _emit();
    },

    /**
     * Load the next page and append results.
     * Called by "Load more" button in the dropdown.
     */
    loadMore: async () => {
        if (_state.page >= _state.totalPages) return;
        const nextPage = _state.page + 1;
        try {
            const res  = await notificationAPI.getAll(nextPage);
            const data = res?.data ?? res ?? {};
            _state = {
                ..._state,
                notifications: [..._state.notifications, ...(data.notifications ?? [])],
                page:          nextPage,
                totalPages:    data.totalPages ?? _state.totalPages,
            };
            _emit();
        } catch { /* silent — user can retry */ }
    },

    /**
     * Called by socket.js when 'noti:new' CustomEvent fires.
     * Prepends the new notification and bumps the unread count.
     * Also triggers the toast via the UI layer.
     */
    addNew: (notification) => {
        _state = {
            ..._state,
            notifications: [notification, ..._state.notifications],
            unreadCount:   _state.unreadCount + 1,
        };
        _emit();
    },

    /**
     * Mark a single notification as read.
     * Optimistic update — reverts on error.
     */
    markOneRead: async (id) => {
        const prev = { ..._state, notifications: [..._state.notifications] };

        // Optimistic
        _state = {
            ..._state,
            notifications: _state.notifications.map(n =>
                (n._id ?? n.id) === id ? { ...n, isRead: true } : n),
            unreadCount: Math.max(0, _state.unreadCount - 1),
        };
        _emit();

        try {
            await notificationAPI.markOneRead(id);
        } catch {
            _state = prev; // revert
            _emit();
        }
    },

    /**
     * Mark all notifications as read.
     * Optimistic update.
     */
    markAllRead: async () => {
        const prev = { ..._state, notifications: [..._state.notifications] };

        _state = {
            ..._state,
            notifications: _state.notifications.map(n => ({ ...n, isRead: true })),
            unreadCount:   0,
        };
        _emit();

        try {
            await notificationAPI.markAllRead();
        } catch {
            _state = prev;
            _emit();
        }
    },

    /**
     * Delete a notification.
     * Optimistic update.
     */
    delete: async (id) => {
        const target = _state.notifications.find(n => (n._id ?? n.id) === id);
        const prev   = { ..._state, notifications: [..._state.notifications] };

        _state = {
            ..._state,
            notifications: _state.notifications.filter(n => (n._id ?? n.id) !== id),
            unreadCount: target && !target.isRead
                ? Math.max(0, _state.unreadCount - 1)
                : _state.unreadCount,
        };
        _emit();

        try {
            await notificationAPI.delete(id);
        } catch {
            _state = prev;
            _emit();
        }
    },

    /** Decrement unread count (called when another tab marks a noti read via socket). */
    decrementUnread: () => {
        if (_state.unreadCount > 0) {
            _state = { ..._state, unreadCount: _state.unreadCount - 1 };
            _emit();
        }
    },
};

// ── Wire socket events ────────────────────────────────────────────────────────
// Listen for CustomEvents dispatched by socket.js so this store
// stays in sync with real-time events on every page automatically.
window.addEventListener('noti:new', (e) => {
    notificationStore.addNew(e.detail);
});

window.addEventListener('noti:markedRead', () => {
    notificationStore.decrementUnread();
});