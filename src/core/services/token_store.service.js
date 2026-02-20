/**
 * Refresh Token Store
 *
 * Tracks valid refresh token JTIs for rotation and revocation.
 * Production: replace this Map with Redis using TTL = REFRESH_EXPIRY
 *
 * Structure: Map<jti, { userId, createdAt }>
 */

const store = new Map();

export const saveRefreshToken = (jti, userId) => {
  store.set(jti, { userId, createdAt: new Date() });
};

export const isRefreshTokenValid = (jti) => store.has(jti);

export const revokeRefreshToken = (jti) => store.delete(jti);

export const revokeAllForUser = (userId) => {
  for (const [jti, data] of store.entries()) {
    if (data.userId === userId) store.delete(jti);
  }
};