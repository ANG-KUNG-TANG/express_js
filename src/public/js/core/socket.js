import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";

let socket = null;

export const initSocket = () => {
    if (socket) return socket;

    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('[socket] No token found — socket not connected');
        return null;
    }

    socket = io(window.location.origin, {
        auth: { token },   // raw token; backend strips "Bearer " if present
    });

    socket.on('connect', () => {
        console.log('[socket] Connected:', socket.id);
    });

    socket.on('disconnect', () => {
        console.log('[socket] Disconnected');
    });

    socket.on('connect_error', (err) => {
        console.error('[socket] Connection error:', err.message);
    });

    return socket;
};

export const getSocket = () => socket;