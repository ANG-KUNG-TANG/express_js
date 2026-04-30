// src/tests/services/redis.service.test.js

import { jest } from '@jest/globals';

// ── ioredis mock ──────────────────────────────────────────────────────────────

const mockGet   = jest.fn();
const mockSet   = jest.fn();
const mockSetex = jest.fn();
const mockDel   = jest.fn();
const mockScan  = jest.fn();
const mockQuit  = jest.fn();

const mockClient = {
    get: mockGet, set: mockSet, setex: mockSetex,
    del: mockDel, scan: mockScan, quit: mockQuit,
    on:   jest.fn(),
    once: jest.fn(),
};

jest.unstable_mockModule('ioredis', () => ({
    default: jest.fn(() => mockClient),
}));

// Dynamic import AFTER mock registration
const mod = await import('../../../src/core/services/redis.service.js');
const { redisGet, redisSet, redisDel, redisDelPattern, CacheKeys, TTL } = mod;

describe('redis.service', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    // ── CacheKeys ─────────────────────────────────────────────────────────────

    describe('CacheKeys', () => {
        it('userNotifications(uid)', () =>
            expect(CacheKeys.userNotifications('u1')).toBe('notifications:u1'));
        it('unreadCount(uid)', () =>
            expect(CacheKeys.unreadCount('u2')).toBe('notifications:u2:unread'));
        it('userTaskList(uid)', () =>
            expect(CacheKeys.userTaskList('u3')).toBe('tasks:u3:list'));
        it('taskDetail(tid)', () =>
            expect(CacheKeys.taskDetail('t1')).toBe('tasks:t1'));
        it('teacherTaskList(tid)', () =>
            expect(CacheKeys.teacherTaskList('t2')).toBe('tasks:teacher:t2:list'));
    });

    // ── TTL ───────────────────────────────────────────────────────────────────

    describe('TTL', () => {
        it('NOTIFICATIONS is 60',  () => expect(TTL.NOTIFICATIONS).toBe(60));
        it('TASK_LIST is 120',     () => expect(TTL.TASK_LIST).toBe(120));
        it('TASK_DETAIL is 300',   () => expect(TTL.TASK_DETAIL).toBe(300));
    });

    // ── No-client guards (before connectRedis is called) ──────────────────────

    describe('redisGet — no client', () => {
        it('returns null when _client is null', async () => {
            const result = await redisGet('any-key');
            expect(result).toBeNull();
            expect(mockGet).not.toHaveBeenCalled();
        });
    });

    describe('redisSet — no client', () => {
        it('does nothing (no throw) when _client is null', async () => {
            await expect(redisSet('k', 'v', 60)).resolves.toBeUndefined();
            expect(mockSetex).not.toHaveBeenCalled();
            expect(mockSet).not.toHaveBeenCalled();
        });
    });

    describe('redisDel — no client', () => {
        it('does nothing when _client is null', async () => {
            await redisDel('k1', 'k2');
            expect(mockDel).not.toHaveBeenCalled();
        });

        it('does nothing when no keys are provided', async () => {
            await redisDel();
            expect(mockDel).not.toHaveBeenCalled();
        });
    });

    describe('redisDelPattern — no client', () => {
        it('does nothing when _client is null', async () => {
            await redisDelPattern('notifications:*');
            expect(mockScan).not.toHaveBeenCalled();
        });
    });

    // ── With active client (after connectRedis) ───────────────────────────────

    describe('with active client', () => {
        beforeAll(async () => {
            // Simulate the 'ready' event firing synchronously so connectRedis resolves
            mockClient.once.mockImplementation((event, cb) => {
                if (event === 'ready') cb();
            });

            process.env.USE_REDIS = 'true';
            process.env.REDIS_URL = 'redis://localhost:6379';
            await mod.connectRedis();
        });

        afterAll(async () => {
            mockQuit.mockResolvedValue('OK');
            await mod.disconnectRedis();
        });

        beforeEach(() => { jest.clearAllMocks(); });

        // redisGet
        it('redisGet — returns parsed value on hit', async () => {
            mockGet.mockResolvedValueOnce(JSON.stringify({ name: 'Alice' }));
            const result = await mod.redisGet('user:1');
            expect(result).toEqual({ name: 'Alice' });
        });

        it('redisGet — returns null on cache miss', async () => {
            mockGet.mockResolvedValueOnce(null);
            expect(await mod.redisGet('miss')).toBeNull();
        });

        it('redisGet — returns null and logs on error', async () => {
            const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
            mockGet.mockRejectedValueOnce(new Error('GET failed'));
            expect(await mod.redisGet('bad')).toBeNull();
            spy.mockRestore();
        });

        // redisSet
        it('redisSet — uses setex when ttl > 0', async () => {
            mockSetex.mockResolvedValueOnce('OK');
            await mod.redisSet('k1', { a: 1 }, 60);
            expect(mockSetex).toHaveBeenCalledWith('k1', 60, JSON.stringify({ a: 1 }));
        });

        it('redisSet — uses set (no TTL) when ttl = 0', async () => {
            mockSet.mockResolvedValueOnce('OK');
            await mod.redisSet('k2', { b: 2 }, 0);
            expect(mockSet).toHaveBeenCalledWith('k2', JSON.stringify({ b: 2 }));
        });

        it('redisSet — uses set when ttl omitted', async () => {
            mockSet.mockResolvedValueOnce('OK');
            await mod.redisSet('k3', 'hello');
            expect(mockSet).toHaveBeenCalledWith('k3', '"hello"');
        });

        it('redisSet — does not throw on error', async () => {
            const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
            mockSet.mockRejectedValueOnce(new Error('SET error'));
            await expect(mod.redisSet('k', 'v')).resolves.not.toThrow();
            spy.mockRestore();
        });

        // redisDel
        it('redisDel — calls del with all provided keys', async () => {
            mockDel.mockResolvedValueOnce(2);
            await mod.redisDel('k1', 'k2');
            expect(mockDel).toHaveBeenCalledWith('k1', 'k2');
        });

        it('redisDel — does not throw on error', async () => {
            const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
            mockDel.mockRejectedValueOnce(new Error('DEL error'));
            await expect(mod.redisDel('k')).resolves.not.toThrow();
            spy.mockRestore();
        });

        // redisDelPattern
        it('redisDelPattern — scans and deletes matched keys', async () => {
            mockScan.mockResolvedValueOnce(['0', ['notifications:u1', 'notifications:u2']]);
            mockDel.mockResolvedValueOnce(2);
            await mod.redisDelPattern('notifications:*');
            expect(mockScan).toHaveBeenCalledWith('0', 'MATCH', 'notifications:*', 'COUNT', 100);
            expect(mockDel).toHaveBeenCalledWith('notifications:u1', 'notifications:u2');
        });

        it('redisDelPattern — handles multiple SCAN pages', async () => {
            mockScan
                .mockResolvedValueOnce(['42', ['k1']])
                .mockResolvedValueOnce(['0',  ['k2']]);
            mockDel.mockResolvedValue(1);
            await mod.redisDelPattern('k*');
            expect(mockScan).toHaveBeenCalledTimes(2);
            expect(mockDel).toHaveBeenCalledTimes(2);
        });

        it('redisDelPattern — skips del when SCAN returns no keys', async () => {
            mockScan.mockResolvedValueOnce(['0', []]);
            await mod.redisDelPattern('empty:*');
            expect(mockDel).not.toHaveBeenCalled();
        });

        it('redisDelPattern — does not throw on error', async () => {
            const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
            mockScan.mockRejectedValueOnce(new Error('SCAN error'));
            await expect(mod.redisDelPattern('p:*')).resolves.not.toThrow();
            spy.mockRestore();
        });
    });
});