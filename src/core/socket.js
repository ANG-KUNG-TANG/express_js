// src/core/socket.js
//
// Socket.IO singleton — lives in src/core/ alongside logger/, services/, etc.
//
// ── Wire it up in your server entry point ────────────────────────────────────
//
//   import http           from 'http';
//   import app            from './app.js';
//   import { initSocket } from './core/socket.js';
//
//   const httpServer = http.createServer(app);
//   initSocket(httpServer);
//   httpServer.listen(process.env.PORT || 3000);
//
// ── Emit from anywhere (e.g. send_noti.uc.js) ────────────────────────────────
//
//   import { getIO } from '../../core/socket.js';
//   getIO()?.to(userId).emit('notification:new', payload);
//
//   The ?. means: if Socket.IO isn't initialised yet, skip silently — no crash.

import { Server } from 'socket.io';

let _io = null;

/**
 * initSocket(httpServer)
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
        pingTimeout:  60000,
        pingInterval: 25000,
    });

    // ── JWT auth middleware ───────────────────────────────────────────────────
    // The frontend connects with:
    //   import { io } from 'socket.io-client';
    //   const socket = io(API_URL, { auth: { token: localStorage.getItem('token') } });
    _io.use((socket, next) => {
        try {
            const raw = socket.handshake.auth?.token ?? '';
            if (!raw) return next(new Error('Authentication required'));

            // Strip "Bearer " prefix if present
            const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;

            // Decode JWT payload without a full verify — fast, no DB hit.
            // If you want full signature verification, swap this line with your
            // existing verifyToken() from src/core/services/jwt.service.js
            const payload = JSON.parse(
                Buffer.from(token.split('.')[1], 'base64url').toString('utf8')
            );

            socket.userId = String(payload._id ?? payload.id ?? payload.sub ?? '');
            if (!socket.userId) return next(new Error('Invalid token payload'));
            next();
        } catch {
            next(new Error('Invalid token'));
        }
    });

    // ── Private per-user room ─────────────────────────────────────────────────
    // Notifications are sent to room = userId so only that user receives them,
    // even if they have multiple browser tabs open simultaneously.
    _io.on('connection', (socket) => {
        socket.join(socket.userId);
        socket.on('disconnect', () => socket.leave(socket.userId));
    });

    console.log('[socket] Socket.IO initialised');
    return _io;
};

/**
 * getIO()
 * Returns the Socket.IO Server, or null before initSocket() is called.
 * Always use optional chaining: getIO()?.to(userId).emit(...)
 */
export const getIO = () => _io;