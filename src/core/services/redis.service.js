import Redis from 'ioredis';

let _client = null;

// ── Feature flag ──────────────────────────────────────────────────────────────
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
        connectTimeout:          10_000,   // 10s — Railway cold-start safety
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

    // Safe startup handler avoiding listener leakage deadlocks
    await new Promise((resolve, reject) => {
        const onReady = () => {
            _client.off('error', onError);
            resolve();
        };
        const onError = (err) => {
            _client.off('ready', onReady);
            console.error('[redis] Failed to connect on startup:', err.message);
            reject(err);
        };
        _client.once('ready', onReady);
        _client.once('error', onError);
    });

    return _client;
};

export const getRedisClient = () => _client;

// ── Graceful shutdown ─────────────────────────────────────────────────────────

export const disconnectRedis = async () => {
    if (_client) {
        try {
            await _client.quit();
            console.log('[redis] Disconnected cleanly');
        } catch (err) {
            console.error('[redis] Error during disconnect:', err.message);
        } finally {
            _client = null;
        }
    }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

export const redisDel = async (...keys) => {
    if (!_client || keys.length === 0) return;
    try {
        await _client.del(...keys);
    } catch (err) {
        console.error(`[redis] DEL error for keys "${keys.join(', ')}":`, err.message);
    }
};

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

// =============================================================================
// ── Cache key factory (Added User scopes)
// =============================================================================
export const CacheKeys = {
    // Users 🔒
    userDetail:        (userId)    => `users:${userId}`,
    userByEmail:       (email)     => `users:email:${email.toLowerCase().trim()}`,

    // Notifications
    userNotifications: (userId)    => `notifications:${userId}`,
    unreadCount:       (userId)    => `notifications:${userId}:unread`,

    // Tasks
    userTaskList:      (userId)    => `tasks:${userId}:list`,
    taskDetail:        (taskId)    => `tasks:${taskId}`,
    teacherTaskList:   (teacherId) => `tasks:teacher:${teacherId}:list`,
};

// =============================================================================
// ── TTL constants (seconds)
// =============================================================================
export const TTL = {
    USER_PROFILE:  1800,  // 30 minutes — Long cache time since profiles update infrequently
    NOTIFICATIONS: 60,    // 1 minute
    TASK_LIST:     120,   // 2 minutes
    TASK_DETAIL:   300,   // 5 minutes
};