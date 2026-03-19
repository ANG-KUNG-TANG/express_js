// core/services/redis.service.js
//
// ── Setup ─────────────────────────────────────────────────────────────────────
//
//   npm install ioredis
//
// ── .env ─────────────────────────────────────────────────────────────────────
//
//   REDIS_URL=redis://localhost:6379
//   # or for Redis Cloud / Upstash:
//   # REDIS_URL=redis://:password@host:port
//
// ── Wire up in server.js (call before routes) ─────────────────────────────────
//
//   import { connectRedis } from './core/services/redis.service.js';
//   await connectRedis();
//
// ── Usage anywhere ────────────────────────────────────────────────────────────
//
//   import { redisGet, redisSet, redisDel } from './core/services/redis.service.js';
//   await redisSet('key', { any: 'object' }, 60);  // TTL in seconds (optional)
//   const val = await redisGet('key');              // returns parsed object or null
//   await redisDel('key');

import Redis from 'ioredis';

let _client = null;

// ── Connection ────────────────────────────────────────────────────────────────

export const connectRedis = async () => {
    if (_client) return _client;

    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';

    _client = new Redis(url, {
        maxRetriesPerRequest: 3,
        enableReadyCheck:     true,
        lazyConnect:          false,
    });

    _client.on('connect',   () => console.log('[redis] Connected'));
    _client.on('ready',     () => console.log('[redis] Ready'));
    _client.on('error',     (err) => console.error('[redis] Error:', err.message));
    _client.on('close',     () => console.warn('[redis] Connection closed'));
    _client.on('reconnecting', () => console.log('[redis] Reconnecting…'));

    // Await the ready event so the app won't start with a broken cache
    await new Promise((resolve, reject) => {
        _client.once('ready', resolve);
        _client.once('error', reject);
    });

    return _client;
};

export const getRedisClient = () => _client;

// ── Graceful shutdown ─────────────────────────────────────────────────────────

export const disconnectRedis = async () => {
    if (_client) {
        await _client.quit();
        _client = null;
        console.log('[redis] Disconnected');
    }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Get a value. Returns parsed object/array/primitive, or null on miss.
 */
export const redisGet = async (key) => {
    if (!_client) return null;
    try {
        const raw = await _client.get(key);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        console.error(`[redis] GET error for key "${key}":`, err.message);
        return null;
    }
};

/**
 * Set a value with optional TTL (seconds).
 * Pass ttl = 0 or omit to store without expiry.
 */
export const redisSet = async (key, value, ttlSeconds = 0) => {
    if (!_client) return;
    try {
        const serialised = JSON.stringify(value);
        if (ttlSeconds > 0) {
            await _client.setex(key, ttlSeconds, serialised);
        } else {
            await _client.set(key, serialised);
        }
    } catch (err) {
        console.error(`[redis] SET error for key "${key}":`, err.message);
    }
};

/**
 * Delete one or more keys.
 */
export const redisDel = async (...keys) => {
    if (!_client || keys.length === 0) return;
    try {
        await _client.del(...keys);
    } catch (err) {
        console.error(`[redis] DEL error for keys "${keys.join(', ')}":`, err.message);
    }
};

/**
 * Delete all keys matching a pattern  e.g.  'notifications:userId:*'
 * Uses SCAN so it's safe on production Redis (no KEYS command).
 */
export const redisDelPattern = async (pattern) => {
    if (!_client) return;
    try {
        let cursor = '0';
        do {
            const [next, keys] = await _client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = next;
            if (keys.length > 0) await _client.del(...keys);
        } while (cursor !== '0');
    } catch (err) {
        console.error(`[redis] DEL pattern error for "${pattern}":`, err.message);
    }
};

// ── Cache key factory ─────────────────────────────────────────────────────────
// Centralise key names so nothing is typed as a raw string in multiple files.

export const CacheKeys = {
    // Phase 1 — notifications
    userNotifications: (userId)      => `notifications:${userId}`,
    unreadCount:       (userId)      => `notifications:${userId}:unread`,

    // Phase 2 — tasks (add more as needed)
    userTaskList:      (userId)      => `tasks:${userId}:list`,
    taskDetail:        (taskId)      => `tasks:${taskId}`,
    teacherTaskList:   (teacherId)   => `tasks:teacher:${teacherId}:list`,
};

// ── TTL constants (seconds) ───────────────────────────────────────────────────

export const TTL = {
    NOTIFICATIONS:  60,        // 1 minute  — invalidated on new noti
    TASK_LIST:      120,       // 2 minutes — invalidated on create/update/delete
    TASK_DETAIL:    300,       // 5 minutes — invalidated on update
};