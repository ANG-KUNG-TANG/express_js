// FIX: removed unused imports (`param` from express-validator, `number` from fp-ts)
// FIX: redis.service.js has no default export — import the client getter instead
import { getRedisClient } from './redis.service.js';
import { REFRESH_TTL_SEC } from './jwt.service.js';

// ── Key helpers ───────────────────────────────────────────────────────────────

const tokenKey  = (userId, jti) => `rt:${userId}:${jti}`;
// FIX: was `rt_se: ${userId}` — trailing space in prefix would corrupt every key
const userSetKey = (userId) => `rt_set:${userId}`;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Persist a new refresh-token JTI in Redis.
 * ttlSeconds should equal REFRESH_TTL_SEC from jwt.service.
 *
 * @param {string} userId
 * @param {string} jti
 * @param {number} ttlSeconds
 */
export const saveRefreshToken = async (userId, jti, ttlSeconds = REFRESH_TTL_SEC) => {
  const redis = getRedisClient();
  if (!redis) return;

  const pipe = redis.pipeline();
  pipe.set(tokenKey(userId, jti), '1', 'EX', ttlSeconds);
  pipe.sadd(userSetKey(userId), jti);
  // FIX: was `pipe.expir(userSecretKey(...))` — two bugs:
  //   1. `expir`      → `expire`    (typo; ioredis has no `expir` method)
  //   2. `userSecretKey` → `userSetKey` (wrong function name — doesn't exist)
  pipe.expire(userSetKey(userId), ttlSeconds * 2);
  await pipe.exec();
};

/**
 * Returns true when the JTI exists in Redis (not revoked, not expired).
 *
 * @param {string} userId
 * @param {string} jti
 * @returns {Promise<boolean>}
 */
export const isRefreshTokenValid = async (userId, jti) => {
  const redis = getRedisClient();
  if (!redis) return false;

  const result = await redis.exists(tokenKey(userId, jti));
  return result === 1;
};

/**
 * Revoke a single refresh token (used on logout or after rotation).
 *
 * @param {string} userId
 * @param {string} jti
 */
export const revokeRefreshToken = async (userId, jti) => {
  const redis = getRedisClient();
  if (!redis) return;

  const pipe = redis.pipeline();
  pipe.del(tokenKey(userId, jti));
  pipe.srem(userSetKey(userId), jti);
  await pipe.exec();
};

/**
 * Revoke ALL active refresh tokens for a user.
 * Use on forced logout, password change, account suspension.
 *
 * @param {string} userId
 */
export const revokeAllForUser = async (userId) => {
  const redis = getRedisClient();
  if (!redis) return;

  const jtis = await redis.smembers(userSetKey(userId));
  if (!jtis.length) return;

  const pipe = redis.pipeline();
  jtis.forEach((jti) => pipe.del(tokenKey(userId, jti)));
  pipe.del(userSetKey(userId));
  await pipe.exec();
};