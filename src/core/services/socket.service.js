// core/services/socket.service.js

import { Server }             from 'socket.io';
import { verifyAccessToken }  from './jwt.service.js';

let _io = null;

// Track online users:  Map<userId, Set<socketId>>
const _onlineUsers = new Map();

// Track admin sockets in a dedicated room so we can broadcast audit events
// without iterating all users.  Admins join 'room:admins' on connect.
const ADMIN_ROOM = 'room:admins';

// ── Init ──────────────────────────────────────────────────────────────────────

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

            socket.userId   = String(payload._id ?? payload.id ?? payload.sub ?? '');
            socket.userRole = String(payload.role ?? '');
            if (!socket.userId) return next(new Error('Invalid token payload'));
            next();
        } catch {
            next(new Error('Invalid token'));
        }
    });

    // ── Connection ────────────────────────────────────────────────────────────
    _io.on('connection', (socket) => {
        const { userId, userRole } = socket;

        // Join private user room
        socket.join(userId);

        // Admins also join the shared admin room — audit events broadcast here
        if (userRole === 'admin') {
            socket.join(ADMIN_ROOM);
        }

        // Track online presence
        if (!_onlineUsers.has(userId)) _onlineUsers.set(userId, new Set());
        _onlineUsers.get(userId).add(socket.id);

        console.log(`[socket] User ${userId} (${userRole}) connected (socketId: ${socket.id}, tabs: ${_onlineUsers.get(userId).size})`);

        socket.on('notification:markRead', (notificationId) => {
            socket.to(userId).emit('noti:markedRead', notificationId);
        });

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

export const getIO = () => _io;

/**
 * Emit an event to ALL active sockets (tabs) of a given user.
 */
export const emitToUser = (userId, event, payload) => {
    if (!_io || !userId) return;
    _io.to(String(userId)).emit(event, payload);
};

/**
 * Emit the same event to multiple users at once.
 */
export const emitToUsers = (userIds, event, payload) => {
    if (!_io || !userIds?.length) return;
    for (const id of userIds) emitToUser(id, event, payload);
};

/**
 * Broadcast an event to every connected admin.
 * Used by audit_logger to push new audit entries in real time.
 *
 * @param {string} event   e.g. 'audit:new'
 * @param {*}      payload
 */
export const emitToAdmins = (event, payload) => {
    if (!_io) return;
    _io.to(ADMIN_ROOM).emit(event, payload);
};

/**
 * Check whether a user currently has at least one open socket connection.
 */
export const isUserOnline = (userId) => (_onlineUsers.get(userId)?.size ?? 0) > 0;