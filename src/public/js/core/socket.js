/**
 * socket.js — single Socket.IO instance shared across the whole app.
 *
 * FIXED: NOTI_TYPES now uses lowercase keys matching backend NotificationType enum.
 * Backend sends e.g. type: 'task_assigned' — uppercase keys caused silent lookup failures.
 *
 * Usage:
 *   import { initSocket, disconnectSocket, getSocket } from './socket.js';
 *   initSocket();
 *   getSocket()?.on('notification:new', handler);
 */

import { io } from 'https://cdn.socket.io/4.7.5/socket.io.esm.min.js';

let socket = null;

// ── Notification type constants ───────────────────────────────────────────────
// FIX: lowercase values to match backend noti_enums.js exactly.
// NOTI_META keys also changed to lowercase so lookups work with real socket events.
export const NOTI_TYPES = Object.freeze({
    TASK_ASSIGNED:  'task_assigned',
    TASK_ACCEPTED:  'task_accepted',
    TASK_DECLINED:  'task_declined',
    TASK_SUBMITTED: 'task_submitted',
    TASK_REVIEWED:  'task_reviewed',
    TASK_SCORED:    'task_scored',
    TASK_REMINDER:  'task_reminder',
    TASK_UNSTARTED: 'task_unstarted',
    ROLE_CHANGED:   'role_changed',
    TEACHER_LINKED: 'teacher_linked',
    TEST_RESULT:    'test_result',
    EXAM_REMINDER:  'exam_reminder',
});

// ── Type metadata — keyed by the lowercase value sent from the backend ────────
// notification_types.js is the authoritative source — this is kept for socket.js
// internal use only. Import from notification_types.js in components.
export const NOTI_META = {
    task_assigned:  { icon: '📋', label: 'New task',          color: '#378ADD' },
    task_accepted:  { icon: '✅', label: 'Task accepted',     color: '#1D9E75' },
    task_declined:  { icon: '❌', label: 'Task declined',     color: '#E24B4A' },
    task_submitted: { icon: '📤', label: 'Task submitted',    color: '#534AB7' },
    task_reviewed:  { icon: '💬', label: 'Feedback given',    color: '#BA7517' },
    task_scored:    { icon: '🏆', label: 'Task scored',       color: '#1D9E75' },
    task_reminder:  { icon: '⏰', label: 'Reminder',          color: '#BA7517' },
    task_unstarted: { icon: '⏳', label: 'Not started',       color: '#BA7517' },
    role_changed:   { icon: '⭐', label: 'Role updated',      color: '#534AB7' },
    teacher_linked: { icon: '🔗', label: 'Teacher assigned',  color: '#378ADD' },
    test_result:    { icon: '📊', label: 'Test result',       color: '#1D9E75' },
    exam_reminder:  { icon: '📅', label: 'Exam reminder',     color: '#E24B4A' },
};

// ── Init ──────────────────────────────────────────────────────────────────────

export const initSocket = () => {
    if (socket?.connected) return socket;

    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('[socket] No token — socket not connected');
        return null;
    }

    socket = io(window.location.origin, {
        auth:                 { token },
        reconnectionAttempts: 5,
        reconnectionDelay:    2000,
    });

    socket.on('connect',       ()      => console.log('[socket] Connected:', socket.id));
    socket.on('disconnect',    (reason) => console.log('[socket] Disconnected:', reason));
    socket.on('connect_error', (err)   => console.error('[socket] Error:', err.message));

    // Dispatch as CustomEvent so any module can listen without importing socket
    socket.on('notification:new', (noti) => {
        console.log('[socket] notification:new', noti.type);
        window.dispatchEvent(new CustomEvent('noti:new', { detail: noti }));
    });

    socket.on('notification:markedRead', (notificationId) => {
        window.dispatchEvent(new CustomEvent('noti:markedRead', { detail: notificationId }));
    });

    return socket;
};

// ── Reconnect with a new token (called by api.js after refresh) ───────────────
export const reconnectSocket = (newToken) => {
    if (!socket) return;
    socket.auth.token = newToken;
    socket.disconnect().connect();
    console.log('[socket] Reconnected with refreshed token');
};

// ── Disconnect (called on logout) ─────────────────────────────────────────────
export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
        console.log('[socket] Disconnected and cleared');
    }
};

export const getSocket = () => socket;