/**
 * api.js — single fetch wrapper + namespaced API exports.
 *
 * Rules:
 *  - This is the ONLY file that calls raw fetch().
 *  - All page JS and store files import from here.
 *  - Auto-attaches Authorization header from localStorage.
 *  - On 401: calls /auth/refresh once (deduplicated across concurrent callers),
 *    stores new token, retries original request.
 *  - On second 401 (after retry): clears session and redirects to login.
 */

import { reconnectSocket } from './socket.js';

// ── Core fetch wrapper ────────────────────────────────────────────────────────

/**
 * Shared in-flight refresh Promise.
 *
 * Problem this solves: when two requests fire simultaneously and both get a
 * 401, the old boolean `_isRefreshing` flag caused the second caller to
 * incorrectly treat the in-progress refresh as a second failure — wiping the
 * session and redirecting to login even though the refresh would have
 * succeeded.
 *
 * Fix: store the Promise itself. Any concurrent 401 caller awaits the same
 * Promise instead of firing a second refresh request. Result: exactly one
 * refresh request per expiry cycle, no duplicate audit log entries.
 */
let _refreshPromise = null;

export const apiFetch = async (path, options = {}, _isRetry = false) => {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store',
        Pragma: 'no-cache',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const res = await fetch(path, { cache: 'no-store', ...options, headers });

    // ── 401: attempt token refresh, then retry once ───────────────────────────
    if (res.status === 401) {
        if (_isRetry) {
            // Already retried with a freshly-issued token — session is truly dead.
            localStorage.clear();
            window.location.href = '/pages/auth/login.html';
            return null;
        }

        // If a refresh is already in flight, all concurrent callers share it.
        if (!_refreshPromise) {
            _refreshPromise = fetch('/api/auth/refresh', {
                method:      'POST',
                credentials: 'include',          // refresh token lives in httpOnly cookie
                headers:     { 'Content-Type': 'application/json' },
            })
                .then(async (refreshRes) => {
                    if (!refreshRes.ok) throw new Error('Refresh failed');

                    const refreshData = await refreshRes.json();
                    const newToken = refreshData.data?.accessToken ?? refreshData.token;
                    if (!newToken) throw new Error('No token in refresh response');

                    localStorage.setItem('token', newToken);
                    reconnectSocket(newToken);       // update socket auth
                })
                .catch(() => {
                    // Refresh truly failed — kill the session once, here.
                    localStorage.clear();
                    window.location.href = '/pages/auth/login.html';
                })
                .finally(() => {
                    // Always reset so future expiry cycles can refresh again.
                    _refreshPromise = null;
                });
        }

        await _refreshPromise;

        // If the catch above redirected us, token is gone — bail silently.
        if (!localStorage.getItem('token')) return null;

        // Retry the original request with the new token.
        return apiFetch(path, options, true);
    }

    // ── 204 No Content ────────────────────────────────────────────────────────
    if (res.status === 204) return null;

    // ── Parse JSON ────────────────────────────────────────────────────────────
    let data;
    try {
        data = await res.json();
    } catch {
        throw new Error('Server returned an invalid response');
    }

    if (!res.ok) {
        const message =
            data?.message ||
            data?.err ||
            data?.error?.message ||
            (typeof data?.error === 'string' ? data.error : null) ||
            `HTTP ${res.status}`;
        throw new Error(message);
    }

    return data;
};

// ── File upload (no Content-Type — browser sets multipart boundary) ───────────
const _uploadFile = async (path, formData) => {
    const token = localStorage.getItem('token');
    const res = await fetch(path, {
        method:  'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body:    formData,
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `Upload failed: HTTP ${res.status}`);
    }
    return res.json();
};

// ── Shorthand methods ─────────────────────────────────────────────────────────
const _get   = (path)       => apiFetch(path);
const _post  = (path, body) => apiFetch(path, { method: 'POST',  body: body ? JSON.stringify(body) : undefined });
const _patch = (path, body) => apiFetch(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
const _put   = (path, body) => apiFetch(path, { method: 'PUT',   body: body ? JSON.stringify(body) : undefined });
const _del   = (path)       => apiFetch(path, { method: 'DELETE' });

// ── Namespaced exports ────────────────────────────────────────────────────────
// Import only what you need:
//   import { taskAPI } from '../../core/api.js';
//   const tasks = await taskAPI.list({ status: 'ASSIGNED' });

export const authAPI = {
    login:          (data)  => _post('/api/auth/login', data),
    logout:         ()      => _post('/api/auth/logout'),
    refresh:        ()      => _post('/api/auth/refresh'),
    forgotPassword: (data)  => _post('/api/auth/forgot-password', data),
    validateToken:  (token) => _get(`/api/auth/reset-password/validate?token=${token}`),
    resetPassword:  (data)  => _post('/api/auth/reset-password', data),
};

export const taskAPI = {
    list:     (params = {}) => _get('/api/writing-tasks?' + new URLSearchParams(params)),
    search:   (params = {}) => _get('/api/writing-tasks/search?' + new URLSearchParams(params)),
    getById:  (id)          => _get(`/api/writing-tasks/${id}`),
    create:   (data)        => _post('/api/writing-tasks', data),
    update:   (id, data)    => _patch(`/api/writing-tasks/${id}`, data),
    start:    (id)          => _patch(`/api/writing-tasks/${id}/start`),
    submit:   (id, data)    => _patch(`/api/writing-tasks/${id}/submit`, data),
    review:   (id, data)    => _patch(`/api/writing-tasks/${id}/review`, data),
    score:    (id, data)    => _patch(`/api/writing-tasks/${id}/score`, data),
    delete:   (id)          => _del(`/api/writing-tasks/${id}`),
    transfer: (data)        => _post('/api/writing-tasks/transfer', data),
    respond:  (id, data)    => _post(`/api/writing-tasks/${id}/respond-assignment`, data),
    vocab:    (word)        => _get(`/api/vocab/${encodeURIComponent(word)}`),
};

export const teacherAPI = {
    // ── Existing ──────────────────────────────────────────────────────────────
    assign:        (data)      => _post('/api/teacher/assign', data),
    listStudents:  ()          => _get('/api/teacher/students'),
    studentTasks:  (studentId) => _get(`/api/teacher/students/${studentId}/tasks`),
    assignedTasks: ()          => _get('/api/teacher/assigned-tasks'),
    listTasks:     ()          => _get('/api/teacher/writing-tasks'),
    searchTasks:   (q)         => _get(`/api/teacher/writing-tasks/search?q=${encodeURIComponent(q)}`),
    getTask:       (id)        => _get(`/api/teacher/writing-tasks/${id}`),
    reviewTask:    (id, data)  => _patch(`/api/teacher/writing-tasks/${id}/review`, data),

    // ── New ───────────────────────────────────────────────────────────────────
    // Single student profile (only succeeds if student is assigned to this teacher)
    getStudent:     (studentId) => _get(`/api/teacher/students/${studentId}`),
    // Dashboard summary: studentCount, pendingReview, activeAssignments, reviewedThisMonth
    dashboardStats: ()          => _get('/api/teacher/dashboard/stats'),
    // Teacher's own profile
    getProfile:     ()          => _get('/api/teacher/profile'),
    updateProfile:  (data)      => _patch('/api/teacher/profile', data),
};

export const adminAPI = {
    // ── Dashboard ─────────────────────────────────────────────────────────────
    stats:            ()                     => _get('/api/admin/stats'),

    // ── Users — list & lookup ─────────────────────────────────────────────────
    listUsers:        ()                     => _get('/api/admin/users'),
    searchUsers:      (params = {})          => _get('/api/admin/users/search?' + new URLSearchParams(params)),
    getUserByEmail:   (email)                => _get(`/api/admin/users/email/${encodeURIComponent(email)}`),
    getUserActivity:  (id)                   => _get(`/api/admin/users/${id}/activity`),

    // ── Users — single actions ────────────────────────────────────────────────
    promoteUser:      (id)                   => _patch(`/api/admin/users/${id}/promote`),
    assignTeacher:    (id)                   => _patch(`/api/admin/users/${id}/assign-teacher`),
    linkTeacher:      (id, data)             => _patch(`/api/admin/users/${id}/link-teacher`, data),
    unlinkTeacher:    (id)                   => _patch(`/api/admin/users/${id}/unlink-teacher`),
    demoteUser:       (id)                   => _patch(`/api/admin/users/${id}/demote`),
    suspendUser:      (id)                   => _patch(`/api/admin/users/${id}/suspend`),
    reactivateUser:   (id)                   => _patch(`/api/admin/users/${id}/reactivate`),
    forcePasswordReset: (id)                 => _post(`/api/admin/users/${id}/force-password-reset`),
    deleteUser:       (id)                   => _del(`/api/admin/users/${id}`),

    // ── Users — bulk actions ──────────────────────────────────────────────────
    bulkDeleteUsers:      (ids)              => apiFetch('/api/admin/users/bulk', { method: 'DELETE', body: JSON.stringify({ ids }) }),
    bulkSuspendUsers:     (ids)              => _patch('/api/admin/users/bulk/suspend', { ids }),
    bulkAssignTeacher:    (studentIds, teacherId) => _patch('/api/admin/users/bulk/assign-teacher', { studentIds, teacherId }),

    // ── Teachers ──────────────────────────────────────────────────────────────
    teacherWorkloads: ()                     => _get('/api/admin/teachers/workloads'),

    // ── Writing tasks ─────────────────────────────────────────────────────────
    listTasks:        (params = {})          => _get('/api/admin/writing-tasks?' + new URLSearchParams(params)),
    searchTasks:      (q, status)            => _get(`/api/admin/writing-tasks/search?${new URLSearchParams({ q, ...(status && { status }) })}`),
    reviewTask:       (id, data)             => _patch(`/api/admin/writing-tasks/${id}/review`, data),
    scoreTask:        (id, data)             => _patch(`/api/admin/writing-tasks/${id}/score`, data),
    transferTasks:    (data)                 => _post('/api/admin/writing-tasks/transfer', data),

    // ── Content moderation ────────────────────────────────────────────────────
    listFlags:        (params = {})          => _get('/api/admin/flags?' + new URLSearchParams(params)),
    flagContent:      (data)                 => _post('/api/admin/flags', data),
    resolveFlag:      (flagId)               => _patch(`/api/admin/flags/${flagId}/resolve`),
    deleteContent:    (taskId)               => _del(`/api/admin/content/${taskId}`),

    // ── Audit logs ────────────────────────────────────────────────────────────
    listAuditLogs:    (params = {})          => _get('/api/admin/audit-logs?' + new URLSearchParams(params)),

    // ── Notifications ─────────────────────────────────────────────────────────
    sendNotification: (data)                 => _post('/api/admin/notifications', data),
};

export const notificationAPI = {
    getAll:      (page = 1, limit = 20) => _get(`/api/notifications?page=${page}&limit=${limit}`),
    markAllRead: ()                     => _patch('/api/notifications/read', { ids: 'all' }),
    markOneRead: (id)                   => _patch(`/api/notifications/${id}/read`),
    delete:      (id)                   => _del(`/api/notifications/${id}`),
};

export const newsAPI = {
    feed:            ()     => _get('/api/news/feed'),
    search:          (q)    => _get(`/api/news/search?q=${encodeURIComponent(q)}`),
    categories:      ()     => _get('/api/news/categories'),
    byCategory:      (cat)  => _get(`/api/news/category/${encodeURIComponent(cat)}`),
    updateInterests: (data) => _patch('/api/news/interests', data),
};

export const profileAPI = {
    get:         ()         => _get('/api/profile/users/me'),
    update:      (data)     => _patch('/api/profile/users/me', data),
    uploadAvatar:(formData) => _uploadFile('/api/profile/users/me/avatar', formData),
    uploadCover: (formData) => _uploadFile('/api/profile/users/me/cover', formData),
    getFiles:    ()         => _get('/api/profile/users/me/files'),
    uploadFiles: (formData) => _uploadFile('/api/profile/users/me/files', formData),
    deleteFile:  (fileId)   => _del(`/api/profile/users/me/files/${fileId}`),
};

export const vocabAPI = {
    lookup:  (word)  => _get(`/api/vocab/${encodeURIComponent(word)}`),
    byTopic: (topic) => _get(`/api/vocab/topic/${encodeURIComponent(topic)}`),
    create:  (data)  => _post('/api/vocab', data),
};

export const userAPI = {
    create:     (data)     => _post('/api/users', data),
    list:       ()         => _get('/api/users/list_users'),
    getById:    (id)       => _get(`/api/users/${id}`),
    getByEmail: (email)    => _get(`/api/users/email/${encodeURIComponent(email)}`),
    update:     (id, data) => _put(`/api/users/${id}`, data),
    delete:     (id)       => _del(`/api/users/${id}`),
    promote:    (id, data) => _patch(`/api/users/${id}/promote`, data),
};

// ── Legacy named exports (keep for backwards compat with existing page files) ─
// These map to the new namespaced API so old imports keep working.
export const fetchNotifications  = (page, limit)           => notificationAPI.getAll(page, limit);
export const markOneRead         = (id)                    => notificationAPI.markOneRead(id);
export const markAllRead         = ()                      => notificationAPI.markAllRead();
export const assignTaskToStudent = (studentId, taskData)   => teacherAPI.assign({ studentId, ...taskData });
export const assignTaskToAll     = (taskData)              => teacherAPI.assign(taskData);