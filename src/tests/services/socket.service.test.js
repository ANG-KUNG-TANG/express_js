// src/tests/services/socket.service.test.js

import { jest } from '@jest/globals';

// ── ESM mocks — must be registered before dynamic import of module under test ──

const mockVerifyAccessToken = jest.fn();

jest.unstable_mockModule('../../../src/core/services/jwt.service.js', () => ({
    verifyAccessToken: mockVerifyAccessToken,
}));

// ── Socket.IO server mock ─────────────────────────────────────────────────────

const mockEmit    = jest.fn();
const mockToChain = { emit: mockEmit };

let _authMiddleware = null;
let _connectionCb  = null;

const ioMock = {
    use: (fn) => { _authMiddleware = fn; },
    on:  (event, fn) => { if (event === 'connection') _connectionCb = fn; },
    to:  jest.fn().mockReturnValue(mockToChain),
};

jest.unstable_mockModule('socket.io', () => ({
    Server: jest.fn(() => ioMock),
}));

// Dynamic import AFTER all mocks are registered
const { Server } = await import('socket.io');
const {
    initSocket,
    getIO,
    emitToUser,
    emitToUsers,
    emitToAdmins,
    isUserOnline,
} = await import('../../../src/core/services/socket.service.js');

// ─────────────────────────────────────────────────────────────────────────────

const buildSocket = (overrides = {}) => ({
    id:        'socket-id-1',
    userId:    null,
    userRole:  null,
    handshake: { auth: { token: 'Bearer valid.jwt.token' } },
    join:      jest.fn(),
    to:        jest.fn().mockReturnThis(),
    emit:      jest.fn(),
    on:        jest.fn(),
    ...overrides,
});

describe('socket.service', () => {
    const fakeServer = {};

    beforeEach(() => {
        jest.clearAllMocks();
        // DO NOT null out _authMiddleware / _connectionCb — they are meant to survive across tests
        ioMock.to.mockReturnValue(mockToChain);
    });

    // ── initSocket ────────────────────────────────────────────────────────────

    describe('initSocket', () => {
        it('creates a Socket.IO Server', () => {
            initSocket(fakeServer);
            expect(Server).toHaveBeenCalledWith(fakeServer, expect.objectContaining({ cors: expect.any(Object) }));
        });

        it('returns the same instance on repeated calls (singleton)', () => {
            const a = initSocket(fakeServer);
            const b = initSocket(fakeServer);
            expect(a).toBe(b);
        });

        it('registers a JWT auth middleware', () => {
            initSocket(fakeServer);
            expect(_authMiddleware).toBeInstanceOf(Function);
        });

        it('registers a connection handler', () => {
            initSocket(fakeServer);
            expect(_connectionCb).toBeInstanceOf(Function);
        });
    });

    // ── JWT auth middleware ───────────────────────────────────────────────────

    describe('JWT auth middleware', () => {
        beforeEach(() => { initSocket(fakeServer); });

        it('calls next(Error) when no token supplied', () => {
            const socket = buildSocket({ handshake: { auth: {} } });
            const next   = jest.fn();
            _authMiddleware(socket, next);
            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });

        it('calls next(Error) when verifyAccessToken throws', () => {
            mockVerifyAccessToken.mockImplementationOnce(() => { throw new Error('bad token'); });
            const next = jest.fn();
            _authMiddleware(buildSocket(), next);
            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });

        it('sets socket.userId and socket.userRole on valid token', () => {
            mockVerifyAccessToken.mockReturnValueOnce({ _id: 'u42', role: 'student' });
            const socket = buildSocket();
            const next   = jest.fn();
            _authMiddleware(socket, next);
            expect(socket.userId).toBe('u42');
            expect(socket.userRole).toBe('student');
            expect(next).toHaveBeenCalledWith(/* no error */);
        });

        it('strips the "Bearer " prefix before calling verify', () => {
            mockVerifyAccessToken.mockReturnValueOnce({ _id: 'u1', role: 'student' });
            const socket = buildSocket({ handshake: { auth: { token: 'Bearer raw.token' } } });
            _authMiddleware(socket, jest.fn());
            expect(mockVerifyAccessToken).toHaveBeenCalledWith('raw.token');
        });

        it('calls next(Error) when token payload has no id fields', () => {
            mockVerifyAccessToken.mockReturnValueOnce({ role: 'student' });
            const next = jest.fn();
            _authMiddleware(buildSocket(), next);
            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    // ── connection handler ────────────────────────────────────────────────────

    describe('connection handler', () => {
        beforeEach(() => { initSocket(fakeServer); });

        it('joins the user to their private room', () => {
            const socket = buildSocket({ userId: 'u1', userRole: 'student' });
            _connectionCb(socket);
            expect(socket.join).toHaveBeenCalledWith('u1');
        });

        it('joins admin users to room:admins', () => {
            const socket = buildSocket({ userId: 'admin1', userRole: 'admin' });
            _connectionCb(socket);
            expect(socket.join).toHaveBeenCalledWith('room:admins');
        });

        it('does NOT join non-admin users to room:admins', () => {
            const socket = buildSocket({ userId: 'u2', userRole: 'teacher' });
            _connectionCb(socket);
            const joinedRooms = socket.join.mock.calls.map(([r]) => r);
            expect(joinedRooms).not.toContain('room:admins');
        });

        it('marks user as online after connect', () => {
            const socket = buildSocket({ userId: 'online-user', userRole: 'student' });
            _connectionCb(socket);
            expect(isUserOnline('online-user')).toBe(true);
        });

        it('marks user as offline after disconnect', () => {
            const socket = buildSocket({ userId: 'disco-user', userRole: 'student' });
            let disconnectCb = null;
            socket.on.mockImplementation((event, cb) => {
                if (event === 'disconnect') disconnectCb = cb;
            });
            _connectionCb(socket);
            disconnectCb();
            expect(isUserOnline('disco-user')).toBe(false);
        });
    });

    // ── getIO ─────────────────────────────────────────────────────────────────

    describe('getIO', () => {
        it('returns the io instance after init', () => {
            initSocket(fakeServer);
            expect(getIO()).toBe(ioMock);
        });
    });

    // ── emitToUser ────────────────────────────────────────────────────────────

    describe('emitToUser', () => {
        beforeEach(() => { initSocket(fakeServer); });

        it('emits to the correct user room', () => {
            emitToUser('user-99', 'notification:new', { id: 1 });
            expect(ioMock.to).toHaveBeenCalledWith('user-99');
            expect(mockToChain.emit).toHaveBeenCalledWith('notification:new', { id: 1 });
        });

        it('does nothing when userId is falsy', () => {
            emitToUser(null, 'event', {});
            expect(ioMock.to).not.toHaveBeenCalled();
        });
    });

    // ── emitToUsers ───────────────────────────────────────────────────────────

    describe('emitToUsers', () => {
        beforeEach(() => { initSocket(fakeServer); });

        it('emits to each user in the array', () => {
            emitToUsers(['u1', 'u2', 'u3'], 'evt', {});
            expect(ioMock.to).toHaveBeenCalledTimes(3);
        });

        it('does nothing for empty array', () => {
            emitToUsers([], 'evt', {});
            expect(ioMock.to).not.toHaveBeenCalled();
        });

        it('does nothing for null/undefined', () => {
            emitToUsers(null, 'evt', {});
            emitToUsers(undefined, 'evt', {});
            expect(ioMock.to).not.toHaveBeenCalled();
        });
    });

    // ── emitToAdmins ──────────────────────────────────────────────────────────

    describe('emitToAdmins', () => {
        beforeEach(() => { initSocket(fakeServer); });

        it('emits to room:admins', () => {
            emitToAdmins('audit:new', { action: 'user.deleted' });
            expect(ioMock.to).toHaveBeenCalledWith('room:admins');
            expect(mockToChain.emit).toHaveBeenCalledWith('audit:new', { action: 'user.deleted' });
        });
    });

    // ── isUserOnline ──────────────────────────────────────────────────────────

    describe('isUserOnline', () => {
        it('returns false for a user who never connected', () => {
            expect(isUserOnline('never-connected')).toBe(false);
        });
    });
});