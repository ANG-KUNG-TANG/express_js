/**
 * api.js — single fetch wrapper + namespaced API exports.
 *
 * Rules:
 *  - This is the ONLY file that calls raw fetch().
 *  - All page JS and store files import from here.
 *  - Auto-attaches Authorization header from localStorage.
 *  - On 401: calls /auth/refresh once, stores new token, retries original request.
 *  - On second 401: clears session and redirects to login.
 */

import { reconnectSocket } from './socket.js';

// ── Core fetch wrapper ────────────────────────────────────────────────────────

let _isRefreshing = false;

export const 
apiFetch = async (path, options = {}, _isRetry = false) => {
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
        if (_isRetry || _isRefreshing) {
            // Second 401 after refresh — session is truly dead
            localStorage.clear();
            window.location.href = '/pages/auth/login.html';
            return null;
        }

        _isRefreshing = true;
        try {
            const refreshRes = await fetch('/api/auth/refresh', {
                method: 'POST',
                credentials: 'include',          // refresh token is in httpOnly cookie
                headers: { 'Content-Type': 'application/json' },
            });

            if (!refreshRes.ok) throw new Error('Refresh failed');

            const refreshData = await refreshRes.json();
            const newToken = refreshData.data?.accessToken ?? refreshData.token;
            if (!newToken) throw new Error('No token in refresh response');

            localStorage.setItem('token', newToken);
            reconnectSocket(newToken);           // update socket auth
        } catch {
            localStorage.clear();
            window.location.href = '/pages/auth/login.html';
            return null;
        } finally {
            _isRefreshing = false;
        }

        // Retry original request with new token
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
        const message = data?.message || data?.err || data?.error?.message || (typeof data?.error === 'string' ? data.error : null) || `HTTP ${res.status}`;
        throw new Error(message);
    }

    return data;
};

// ── File upload (no Content-Type — browser sets multipart boundary) ───────────
const _uploadFile = async (path, formData) => {
    const token = localStorage.getItem('token');
    const res = await fetch(path, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
const _post  = (path, body) => apiFetch(path, { method: 'POST',  body: body ? JSON.stringify(body) : undefined });
const _patch = (path, body) => apiFetch(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
const _put   = (path, body) => apiFetch(path, { method: 'PUT',   body: body ? JSON.stringify(body) : undefined });
const _del   = (path)       => apiFetch(path, { method: 'DELETE' });

// ── Namespaced exports ────────────────────────────────────────────────────────
// Import only what you need:
//   import { taskAPI } from '../../core/api.js';
//   const tasks = await taskAPI.list({ status: 'ASSIGNED' });

export const authAPI = {
    login:          (data)      => _post('/api/auth/login', data),
    logout:         ()          => _post('/api/auth/logout'),
    refresh:        ()          => _post('/api/auth/refresh'),
    forgotPassword: (data)      => _post('/api/auth/forgot-password', data),
    validateToken:  (token)     => _get(`/api/auth/reset-password/validate?token=${token}`),
    resetPassword:  (data)      => _post('/api/auth/reset-password', data),
};

export const taskAPI = {
    list:     (params = {})  => _get('/api/writing-tasks?' + new URLSearchParams(params)),
    search:   (params = {})  => _get('/api/writing-tasks/search?' + new URLSearchParams(params)),
    getById:  (id)           => _get(`/api/writing-tasks/${id}`),
    create:   (data)         => _post('/api/writing-tasks', data),
    update:   (id, data)     => _patch(`/api/writing-tasks/${id}`, data),
    start:    (id)           => _patch(`/api/writing-tasks/${id}/start`),
    submit:   (id, data)     => _patch(`/api/writing-tasks/${id}/submit`, data),
    review:   (id, data)     => _patch(`/api/writing-tasks/${id}/review`, data),
    score:    (id, data)     => _patch(`/api/writing-tasks/${id}/score`, data),
    delete:   (id)           => _del(`/api/writing-tasks/${id}`),
    transfer: (data)         => _post('/api/writing-tasks/transfer', data),
    respond:  (id, data)     => _post(`/api/writing-tasks/${id}/respond-assignment`, data),
    vocab:    (word)         => _get(`/api/vocab/${encodeURIComponent(word)}`),
};

export const teacherAPI = {
    assign:        (data)          => _post('/api/teacher/assign', data),
    listStudents:  ()              => _get('/api/teacher/students'),
    studentTasks:  (studentId)     => _get(`/api/teacher/students/${studentId}/tasks`),
    assignedTasks: ()              => _get('/api/teacher/assigned-tasks'),
    listTasks:     ()              => _get('/api/teacher/writing-tasks'),
    searchTasks:   (q)             => _get(`/api/teacher/writing-tasks/search?q=${encodeURIComponent(q)}`),
    getTask:       (id)            => _get(`/api/teacher/writing-tasks/${id}`),
    reviewTask:    (id, data)      => _patch(`/api/teacher/writing-tasks/${id}/review`, data),
};

export const adminAPI = {
    stats:           ()             => _get('/api/admin/stats'),
    listUsers:       ()             => _get('/api/admin/users'),
    getUserByEmail:  (email)        => _get(`/api/admin/users/email/${encodeURIComponent(email)}`),
    promoteUser:     (id, data)     => _patch(`/api/admin/users/${id}/promote`, data),
    assignTeacher:   (id, data)     => _patch(`/api/admin/users/${id}/assign-teacher`, data),
    linkTeacher:     (id, data)     => _patch(`/api/admin/users/${id}/link-teacher`, data),
    unlinkTeacher:   (id)           => _patch(`/api/admin/users/${id}/unlink-teacher`),
    deleteUser:      (id)           => _del(`/api/admin/users/${id}`),
    listTasks:       (params = {})  => _get('/api/admin/writing-tasks?' + new URLSearchParams(params)),
    searchTasks:     (q)            => _get(`/api/admin/writing-tasks/search?q=${encodeURIComponent(q)}`),
    reviewTask:      (id, data)     => _patch(`/api/admin/writing-tasks/${id}/review`, data),
    scoreTask:       (id, data)     => _patch(`/api/admin/writing-tasks/${id}/score`, data),
    transferTasks:   (data)         => _post('/api/admin/writing-tasks/transfer', data),
    // ── Content moderation ───────────────────────────────────────────────────
    listFlags:       (params = {})  => _get('/api/admin/flags?' + new URLSearchParams(params)),
    flagContent:     (data)         => _post('/api/admin/flags', data),
    resolveFlag:     (flagId)       => _post(`/api/admin/flags/${flagId}/resolve`),
    deleteContent:   (taskId)       => _del(`/api/admin/content/${taskId}`),
    // ── Audit logs ───────────────────────────────────────────────────────────
    listAuditLogs:   (params = {})  => _get('/api/admin/audit-logs?' + new URLSearchParams(params)),
    // ── Notifications ────────────────────────────────────────────────────────
    sendNotification:(data)         => _post('/api/admin/notifications', data),
};

export const notificationAPI = {
    getAll:      (page = 1, limit = 20) => _get(`/api/notifications?page=${page}&limit=${limit}`),
    markAllRead: ()                     => _patch('/api/notifications/read', { ids: 'all' }),
    markOneRead: (id)                   => _patch(`/api/notifications/${id}/read`),
    delete:      (id)                   => _del(`/api/notifications/${id}`),
};

export const newsAPI = {
    feed:            ()       => _get('/api/news/feed'),
    search:          (q)      => _get(`/api/news/search?q=${encodeURIComponent(q)}`),
    categories:      ()       => _get('/api/news/categories'),
    byCategory:      (cat)    => _get(`/api/news/category/${encodeURIComponent(cat)}`),
    updateInterests: (data)   => _patch('/api/news/interests', data),
};

export const profileAPI = {
    get:         ()           => _get('/api/profile/users/me'),
    update:      (data)       => _patch('/api/profile/users/me', data),
    uploadAvatar:(formData)   => _uploadFile('/api/profile/users/me/avatar', formData),
    uploadCover: (formData)   => _uploadFile('/api/profile/users/me/cover', formData),
    getFiles:    ()           => _get('/api/profile/users/me/files'),
    uploadFiles: (formData)   => _uploadFile('/api/profile/users/me/files', formData),
    deleteFile:  (fileId)     => _del(`/api/profile/users/me/files/${fileId}`),
};

export const vocabAPI = {
    lookup:  (word)   => _get(`/api/vocab/${encodeURIComponent(word)}`),
    byTopic: (topic)  => _get(`/api/vocab/topic/${encodeURIComponent(topic)}`),
    create:  (data)   => _post('/api/vocab', data),
};

export const userAPI = {
    create:      (data)      => _post('/api/users', data),
    list:        ()          => _get('/api/users/list_users'),
    getById:     (id)        => _get(`/api/users/${id}`),
    getByEmail:  (email)     => _get(`/api/users/email/${encodeURIComponent(email)}`),
    update:      (id, data)  => _put(`/api/users/${id}`, data),
    delete:      (id)        => _del(`/api/users/${id}`),
    promote:     (id, data)  => _patch(`/api/users/${id}/promote`, data),
};

// ── Legacy named exports (keep for backwards compat with existing page files) ─
// These map to the new namespaced API so old imports keep working.
export const fetchNotifications = (page, limit) => notificationAPI.getAll(page, limit);
export const markOneRead        = (id)           => notificationAPI.markOneRead(id);
export const markAllRead        = ()             => notificationAPI.markAllRead();
export const assignTaskToStudent = (studentId, taskData) => teacherAPI.assign({ studentId, ...taskData });
export const assignTaskToAll     = (taskData)             => teacherAPI.assign(taskData);