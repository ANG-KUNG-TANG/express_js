// core/socket.js
//
// ── Wire up in server.js ──────────────────────────────────────────────────────
//
//   import http                from 'http';
//   import app                 from './app.js';
//   import { initSocket }      from './core/socket.js';
//
//   const httpServer = http.createServer(app);
//   initSocket(httpServer);
//   httpServer.listen(process.env.PORT || 3000);
//
// ── Emit from notification.service.js (preferred — never call this directly from UCs) ──
//
//   import { emitToUser } from '../../core/socket.js';
//   emitToUser(userId, 'notification:new', payload);

import { Server }             from 'socket.io';
import { verifyAccessToken }  from './jwt.service.js';

let _io = null;

// Track online users:  Map<userId, Set<socketId>>
// Lets you check if a user is online before deciding to send a push later (Phase 2).
const _onlineUsers = new Map();

// ── Init ──────────────────────────────────────────────────────────────────────

/**
 * Call once in server.js after http.createServer(app).
 * Safe to call multiple times — only initialises once.
 */
export const initSocket = (httpServer) => {
    if (_io) return _io;

    _io = new Server(httpServer, {
        cors: {
            origin:      process.env.CLIENT_ORIGIN ?? '*',
            credentials: true,
        },
        pingTimeout:  60_000,
        pingInterval: 25_000,
    });

    // ── JWT auth middleware ───────────────────────────────────────────────────
    _io.use((socket, next) => {
        try {
            const raw = socket.handshake.auth?.token ?? '';
            if (!raw) return next(new Error('Authentication required'));

            const token   = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
            const payload = verifyAccessToken(token);

            socket.userId = String(payload._id ?? payload.id ?? payload.sub ?? '');
            if (!socket.userId) return next(new Error('Invalid token payload'));
            next();
        } catch {
            next(new Error('Invalid token'));
        }
    });

    // ── Connection ────────────────────────────────────────────────────────────
    _io.on('connection', (socket) => {
        const { userId } = socket;

        // Join private room (all tabs share the same room)
        socket.join(userId);

        // Track online presence
        if (!_onlineUsers.has(userId)) _onlineUsers.set(userId, new Set());
        _onlineUsers.get(userId).add(socket.id);

        console.log(`[socket] User ${userId} connected  (socketId: ${socket.id}, tabs: ${_onlineUsers.get(userId).size})`);

        // ── Client can mark notifications as read via socket (optional) ───────
        socket.on('notification:markRead', (notificationId) => {
            // Just an event hook — the UC handles DB update via REST.
            // Broadcast to all tabs of the same user so the badge updates everywhere.
            socket.to(userId).emit('notification:markedRead', notificationId);
        });

        // ── Disconnect ────────────────────────────────────────────────────────
        socket.on('disconnect', () => {
            const sockets = _onlineUsers.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) _onlineUsers.delete(userId);
            }
            console.log(`[socket] User ${userId} disconnected (socketId: ${socket.id})`);
        });
    });

    console.log('[socket] Socket.IO initialised');
    return _io;
};

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Returns the raw Socket.IO Server instance.
 * Prefer emitToUser() for notifications.
 */
export const getIO = () => _io;

/**
 * Emit an event to ALL active sockets (tabs) of a given user.
 * Safe to call when the user is offline — nothing happens.
 *
 * @param {string} userId
 * @param {string} event   e.g. 'notification:new'
 * @param {*}      payload
 */
export const emitToUser = (userId, event, payload) => {
    if (!_io || !userId) return;
    _io.to(String(userId)).emit(event, payload);
};

/**
 * Emit the same event to multiple users at once.
 * Useful for "assign task to all students" operations.
 *
 * @param {string[]} userIds
 * @param {string}   event
 * @param {*}        payload
 */
export const emitToUsers = (userIds, event, payload) => {
    if (!_io || !userIds?.length) return;
    for (const id of userIds) emitToUser(id, event, payload);
};

/**
 * Check whether a user currently has at least one open socket connection.
 * Useful in Phase 2 for deciding whether to send a push notification instead.
 *
 * @param  {string}  userId
 * @returns {boolean}
 */
export const isUserOnline = (userId) => (_onlineUsers.get(userId)?.size ?? 0) > 0;