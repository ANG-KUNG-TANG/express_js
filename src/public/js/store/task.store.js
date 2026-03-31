/**
 * js/store/task.store.js
 *
 * Caches the task list, active filters, and pagination state.
 * Prevents redundant API calls when navigating between list and detail views.
 * The task list page writes to this store; the detail page reads the cached task
 * so it doesn't need to fetch again if the data is fresh.
 *
 * Usage:
 *   import { taskStore } from '../store/task.store.js';
 *
 *   // list.js — load with current filters
 *   await taskStore.load({ status: 'ASSIGNED', page: 1 });
 *
 *   // detail.js — get a single cached task without a new fetch
 *   const task = taskStore.getById(id);
 *   if (!task) { // not in cache, fetch from API }
 *
 *   // After create/delete — invalidate so next load is fresh
 *   taskStore.invalidate();
 */

import { taskAPI } from '../core/api.js';

// ── Internal state ────────────────────────────────────────────────────────────
let _state = {
    tasks:      [],
    total:      0,
    page:       1,
    totalPages: 1,
    filters:    {},        // { status, taskType, examType, q }
    loading:    false,
    error:      null,
    loadedAt:   null,      // timestamp of last successful load
};

const CACHE_TTL_MS = 60_000; // 1 minute — stale after this

const _listeners = new Set();

const _emit = () => {
    const snapshot = { ..._state, tasks: [..._state.tasks] };
    _listeners.forEach(fn => fn(snapshot));
};

// ── Public API ────────────────────────────────────────────────────────────────

export const taskStore = {

    getState: () => ({ ..._state, tasks: [..._state.tasks] }),

    /**
     * Subscribe to state changes.
     * Immediately calls fn with current state.
     * Returns an unsubscribe function.
     */
    subscribe: (fn) => {
        _listeners.add(fn);
        fn({ ..._state, tasks: [..._state.tasks] });
        return () => _listeners.delete(fn);
    },

    /**
     * Load tasks from API with optional filter params.
     * If the same filters were loaded within CACHE_TTL_MS, uses cached data.
     *
     * @param {{ status?, taskType?, examType?, q?, page? }} filters
     * @param {{ force?: boolean }} options — force=true bypasses cache
     */
    load: async (filters = {}, { force = false } = {}) => {
        const { page = 1, ...activeFilters } = filters;

        // Cache hit — same filters, data still fresh, not forced
        const sameFilters = JSON.stringify(activeFilters) === JSON.stringify(_state.filters);
        const samePage    = page === _state.page;
        const fresh       = _state.loadedAt && (Date.now() - _state.loadedAt) < CACHE_TTL_MS;
        if (!force && sameFilters && samePage && fresh && _state.tasks.length) {
            return; // use cached data, emit nothing (UI already up to date)
        }

        _state = { ..._state, loading: true, error: null, filters: activeFilters, page };
        _emit();

        try {
            const params = { page, ...activeFilters };
            const res    = activeFilters.q
                ? await taskAPI.search(params)
                : await taskAPI.list(params);

            const tasks = res?.data ?? [];
            const meta  = res?.meta ?? res ?? {};

            _state = {
                ..._state,
                tasks,
                total:      meta.total      ?? tasks.length,
                totalPages: meta.totalPages ?? 1,
                loading:    false,
                error:      null,
                loadedAt:   Date.now(),
            };
        } catch (err) {
            _state = { ..._state, loading: false, error: err.message };
        }
        _emit();
    },

    /**
     * Get a single task from the cache by ID.
     * Returns null if not cached — caller should fetch from API.
     */
    getById: (id) => {
        return _state.tasks.find(t => (t._id ?? t.id) === id) ?? null;
    },

    /**
     * Update a single task in the cache after a PATCH (start, submit, update notes).
     * Prevents stale data when navigating back to the list.
     */
    updateOne: (id, patch) => {
        _state = {
            ..._state,
            tasks: _state.tasks.map(t =>
                (t._id ?? t.id) === id ? { ...t, ...patch } : t),
        };
        _emit();
    },

    /**
     * Remove a single task from the cache after DELETE.
     */
    removeOne: (id) => {
        _state = {
            ..._state,
            tasks:      _state.tasks.filter(t => (t._id ?? t.id) !== id),
            total:      Math.max(0, _state.total - 1),
        };
        _emit();
    },

    /**
     * Mark the cache as stale so the next load() call always hits the API.
     * Call after create, delete, or any operation that changes the list shape.
     */
    invalidate: () => {
        _state = { ..._state, loadedAt: null };
    },

    /** Reset everything — called on logout. */
    clear: () => {
        _state = {
            tasks: [], total: 0, page: 1, totalPages: 1,
            filters: {}, loading: false, error: null, loadedAt: null,
        };
        _emit();
    },
};

// ── Keep cache in sync with real-time socket events ───────────────────────────
// When a teacher scores or reviews a task, update the cached status badge
// without requiring a page refresh or a new API call.
window.addEventListener('noti:new', (e) => {
    const noti = e.detail;
    const refId = noti.metadata?.refId ?? noti.refId;
    if (!refId) return;

    if (noti.type === 'task_scored') {
        taskStore.updateOne(refId, { status: 'SCORED' });
    } else if (noti.type === 'task_reviewed') {
        taskStore.updateOne(refId, { status: 'REVIEWED' });
    }
});