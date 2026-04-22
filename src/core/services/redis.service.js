// core/services/redis.service.js
//
// ── .env / Railway Variables ──────────────────────────────────────────────────
//
//   REDIS_URL=redis://localhost:6379          ← local dev
//   REDIS_URL=${{Redis.REDIS_URL}}            ← Railway (set in Variables tab)
//   USE_REDIS=true                            ← set to false to disable entirely
//
// ── Wire up in server.js ──────────────────────────────────────────────────────
//
//   import { connectRedis, disconnectRedis } from './core/services/redis.service.js';
//   await connectRedis();
//   // ... on shutdown:
//   await disconnectRedis();
//
// ── Usage anywhere ────────────────────────────────────────────────────────────
//
//   import { redisGet, redisSet, redisDel } from './core/services/redis.service.js';
//   await redisSet('key', { any: 'object' }, 60);  // TTL in seconds (optional)
//   const val = await redisGet('key');              // returns parsed object or null
//   await redisDel('key');

import Redis from 'ioredis';

let _client = null;

// ── Feature flag ──────────────────────────────────────────────────────────────
// Set USE_REDIS=false to run without Redis (all cache ops become no-ops)

const isRedisEnabled = () => process.env.USE_REDIS !== 'false';

// ── Connection ────────────────────────────────────────────────────────────────

export const connectRedis = async () => {
    if (!isRedisEnabled()) {
        console.warn('[redis] Disabled via USE_REDIS=false — skipping connection');
        return null;
    }

    if (_client) return _client;

    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';

    _client = new Redis(url, {
        maxRetriesPerRequest:    3,
        enableReadyCheck:        true,
        lazyConnect:             false,
        connectTimeout:          10_000,   // 10s — Railway cold-start can be slow
        retryStrategy: (times) => {
            if (times > 5) {
                console.error('[redis] Too many retries — giving up');
                return null; // stop retrying
            }
            const delay = Math.min(times * 300, 3000);
            console.warn(`[redis] Retry #${times} in ${delay}ms…`);
            return delay;
        },
    });

    _client.on('connect',      () => console.log('[redis] Connected'));
    _client.on('ready',        () => console.log('[redis] Ready'));
    _client.on('error',        (err) => console.error('[redis] Error:', err.message));
    _client.on('close',        () => console.warn('[redis] Connection closed'));
    _client.on('reconnecting', () => console.log('[redis] Reconnecting…'));

    // Wait for ready before the app starts accepting requests
    await new Promise((resolve, reject) => {
        _client.once('ready', resolve);
        _client.once('error', (err) => {
            console.error('[redis] Failed to connect on startup:', err.message);
            reject(err);
        });
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
 * Get a value. Returns parsed object/array/primitive, or null on miss/error.
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

export const CacheKeys = {
    // Notifications
    userNotifications: (userId)    => `notifications:${userId}`,
    unreadCount:       (userId)    => `notifications:${userId}:unread`,

    // Tasks
    userTaskList:      (userId)    => `tasks:${userId}:list`,
    taskDetail:        (taskId)    => `tasks:${taskId}`,
    teacherTaskList:   (teacherId) => `tasks:teacher:${teacherId}:list`,
};

// ── TTL constants (seconds) ───────────────────────────────────────────────────

export const TTL = {
    NOTIFICATIONS: 60,    // 1 minute  — invalidated on new notification
    TASK_LIST:     120,   // 2 minutes — invalidated on create/update/delete
    TASK_DETAIL:   300,   // 5 minutes — invalidated on update
};