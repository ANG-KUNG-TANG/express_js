/**
 * api.js — single fetch wrapper + namespaced API exports.
 *
 * Rules:
 *  - This is the ONLY file that calls raw fetch().
 *  - All page JS and store files import from here.
 *  - Auto-attaches Authorization + x-csrf-token headers.
 *  - On 401: calls /auth/refresh once (deduplicated across concurrent callers),
 *    stores new token, retries original request.
 *  - On second 401 (after retry): clears session and redirects to login.
 */

import { reconnectSocket } from './socket.js';

// ── CSRF token management ─────────────────────────────────────────────────────
// Fetched once on first mutation request, then cached in memory.
// Re-fetched automatically if the server returns 403 (token rotated).

let _csrfToken = null;

const getCsrfToken = async () => {
    if (_csrfToken) return _csrfToken;
    try {
        const res  = await fetch('/api/auth/csrf-token', { credentials: 'include' });
        const data = await res.json();
        _csrfToken = data.csrfToken;
        return _csrfToken;
    } catch {
        console.warn('[api] Failed to fetch CSRF token');
        return null;
    }
};

// Methods that mutate state and need a CSRF token
const CSRF_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

// ── Refresh deduplication ─────────────────────────────────────────────────────
let _refreshPromise = null;

// ── Core fetch wrapper ────────────────────────────────────────────────────────

export const apiFetch = async (path, options = {}, _isRetry = false) => {
    const token  = localStorage.getItem('token');
    const method = (options.method || 'GET').toUpperCase();

    // Attach CSRF token for state-changing requests
    let csrfHeader = {};
    if (CSRF_METHODS.has(method)) {
        const csrf = await getCsrfToken();
        if (csrf) csrfHeader = { 'x-csrf-token': csrf };
    }

    const headers = {
        'Content-Type':  'application/json',
        'Cache-Control': 'no-cache, no-store',
        'Pragma':        'no-cache',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...csrfHeader,
        ...options.headers,
    };

    const res = await fetch(path, {
        credentials: 'include',   // send cookies (refresh_token, x-csrf-token)
        cache:       'no-store',
        ...options,
        headers,
    });

    // ── 403: CSRF token may have expired — refresh it and retry once ──────────
    if (res.status === 403 && !_isRetry) {
        _csrfToken = null;               // bust the cache
        const csrf = await getCsrfToken();
        if (csrf) {
            return apiFetch(path, options, true);
        }
    }

    // ── 401: attempt token refresh, then retry once ───────────────────────────
    if (res.status === 401) {
        // Never attempt refresh on auth pages — no session exists yet,
        // and trying would cause a redirect loop (login → refresh fails → login).
        const onAuthPage = window.location.pathname.includes('/auth/');
        if (onAuthPage) {
            let msg = 'Authentication failed';
            try { msg = (await res.clone().json())?.message || msg; } catch {}
            throw new Error(msg);
        }
        if (_isRetry) {
            localStorage.clear();
            window.location.href = '/pages/auth/login.html';
            return null;
        }

        if (!_refreshPromise) {
            _refreshPromise = fetch('/api/auth/refresh', {
                method:      'POST',
                credentials: 'include',
                headers:     { 'Content-Type': 'application/json' },
            })
                .then(async (refreshRes) => {
                    if (!refreshRes.ok) throw new Error('Refresh failed');
                    const refreshData = await refreshRes.json();
                    const newToken = refreshData.data?.accessToken ?? refreshData.token;
                    if (!newToken) throw new Error('No token in refresh response');
                    localStorage.setItem('token', newToken);
                    reconnectSocket(newToken);
                })
                .catch(() => {
                    localStorage.clear();
                    window.location.href = '/pages/auth/login.html';
                })
                .finally(() => {
                    _refreshPromise = null;
                });
        }

        await _refreshPromise;

        if (!localStorage.getItem('token')) return null;
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
    const csrf  = await getCsrfToken();
    const res = await fetch(path, {
        method:      'POST',
        credentials: 'include',
        headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
            ...(csrf  && { 'x-csrf-token': csrf }),
        },
        body: formData,
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `Upload failed: HTTP ${res.status}`);
    }
    return res.json();
};

// ── Shorthand methods ─────────────────────────────────────────────────────────
const _get   = (path)       => apiFetch(path);
const _post  = (path, body) => apiFetch(path, { method: 'POST',   body: body ? JSON.stringify(body) : undefined });
const _patch = (path, body) => apiFetch(path, { method: 'PATCH',  body: body ? JSON.stringify(body) : undefined });
const _put   = (path, body) => apiFetch(path, { method: 'PUT',    body: body ? JSON.stringify(body) : undefined });
const _del   = (path)       => apiFetch(path, { method: 'DELETE' });

// ── Namespaced exports ────────────────────────────────────────────────────────

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
    // ── AI check ─────────────────────────────────────────────────────────────
    // Only works after submission (SUBMITTED / REVIEWED / SCORED).
    // Rate limited to 5/day per user — server enforces this.
    aiCheck:  (id)          => _post(`/api/writing-tasks/${id}/ai-check`),
};

export const teacherAPI = {
    assign:        (data)      => _post('/api/teacher/assign', data),
    listStudents:  ()          => _get('/api/teacher/students'),
    studentTasks:  (studentId) => _get(`/api/teacher/students/${studentId}/tasks`),
    assignedTasks: ()          => _get('/api/teacher/assigned-tasks'),
    listTasks:     ()          => _get('/api/teacher/writing-tasks'),
    searchTasks:   (q)         => _get(`/api/teacher/writing-tasks/search?q=${encodeURIComponent(q)}`),
    getTask:       (id)        => _get(`/api/teacher/writing-tasks/${id}`),
    reviewTask:    (id, data)  => _patch(`/api/teacher/writing-tasks/${id}/review`, data),
    getStudent:    (studentId) => _get(`/api/teacher/students/${studentId}`),
    dashboardStats:()          => _get('/api/teacher/dashboard/stats'),
    getProfile:    ()          => _get('/api/teacher/profile'),
    updateProfile: (data)      => _patch('/api/teacher/profile', data),
};

export const adminAPI = {
    stats:              ()                          => _get('/api/admin/stats'),
    listUsers:          ()                          => _get('/api/admin/users'),
    searchUsers:        (params = {})               => _get('/api/admin/users/search?' + new URLSearchParams(params)),
    getUserByEmail:     (email)                     => _get(`/api/admin/users/email/${encodeURIComponent(email)}`),
    getUserActivity:    (id)                        => _get(`/api/admin/users/${id}/activity`),
    promoteUser:        (id)                        => _patch(`/api/admin/users/${id}/promote`),
    assignTeacher:      (id)                        => _patch(`/api/admin/users/${id}/assign-teacher`),
    linkTeacher:        (id, data)                  => _patch(`/api/admin/users/${id}/link-teacher`, data),
    unlinkTeacher:      (id)                        => _patch(`/api/admin/users/${id}/unlink-teacher`),
    demoteUser:         (id)                        => _patch(`/api/admin/users/${id}/demote`),
    suspendUser:        (id)                        => _patch(`/api/admin/users/${id}/suspend`),
    reactivateUser:     (id)                        => _patch(`/api/admin/users/${id}/reactivate`),
    forcePasswordReset: (id)                        => _post(`/api/admin/users/${id}/force-password-reset`),
    deleteUser:         (id)                        => _del(`/api/admin/users/${id}`),
    bulkDeleteUsers:    (ids)                       => apiFetch('/api/admin/users/bulk', { method: 'DELETE', body: JSON.stringify({ ids }) }),
    bulkSuspendUsers:   (ids)                       => _patch('/api/admin/users/bulk/suspend', { ids }),
    bulkAssignTeacher:  (studentIds, teacherId)     => _patch('/api/admin/users/bulk/assign-teacher', { studentIds, teacherId }),
    teacherWorkloads:   ()                          => _get('/api/admin/teachers/workloads'),
    listTasks:          (params = {})               => _get('/api/admin/writing-tasks?' + new URLSearchParams(params)),
    searchTasks:        (q, status)                 => _get(`/api/admin/writing-tasks/search?${new URLSearchParams({ q, ...(status && { status }) })}`),
    reviewTask:         (id, data)                  => _patch(`/api/admin/writing-tasks/${id}/review`, data),
    scoreTask:          (id, data)                  => _patch(`/api/admin/writing-tasks/${id}/score`, data),
    transferTasks:      (data)                      => _post('/api/admin/writing-tasks/transfer', data),
    listFlags:          (params = {})               => _get('/api/admin/flags?' + new URLSearchParams(params)),
    flagContent:        (data)                      => _post('/api/admin/flags', data),
    resolveFlag:        (flagId)                    => _patch(`/api/admin/flags/${flagId}/resolve`),
    deleteContent:      (taskId)                    => _del(`/api/admin/content/${taskId}`),
    listAuditLogs:      (params = {})               => _get('/api/admin/audit-logs?' + new URLSearchParams(params)),
    sendNotification:   (data)                      => _post('/api/admin/notifications', data),
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
    get:          ()         => _get('/api/profile/users/me'),
    update:       (data)     => _patch('/api/profile/users/me', data),
    uploadAvatar: (formData) => _uploadFile('/api/profile/users/me/avatar', formData),
    uploadCover:  (formData) => _uploadFile('/api/profile/users/me/cover', formData),
    getFiles:     ()         => _get('/api/profile/users/me/files'),
    uploadFiles:  (formData) => _uploadFile('/api/profile/users/me/files', formData),
    deleteFile:   (fileId)   => _del(`/api/profile/users/me/files/${fileId}`),
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

// ── Legacy named exports (backwards compat) ───────────────────────────────────
export const fetchNotifications  = (page, limit)         => notificationAPI.getAll(page, limit);
export const markOneRead         = (id)                  => notificationAPI.markOneRead(id);
export const markAllRead         = ()                    => notificationAPI.markAllRead();
export const assignTaskToStudent = (studentId, taskData) => teacherAPI.assign({ studentId, ...taskData });
export const assignTaskToAll     = (taskData)            => teacherAPI.assign(taskData);