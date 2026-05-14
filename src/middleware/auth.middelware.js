// src/middleware/auth.middleware.js
import {
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
  REFRESH_TTL_SEC,
} from '../core/services/jwt.service.js';
import {
  isRefreshTokenValid,
  revokeRefreshToken,
  saveRefreshToken,
  revokeAllForUser,
} from '../core/services/token_store.service.js';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   7 * 24 * 60 * 60 * 1000,
};

// ---------------------------------------------------------------------------
// authenticate — sets req.user = { id, email, role }
// ---------------------------------------------------------------------------

export const authenticate = async (req, res, next) => {
  const authHeader  = req.headers['authorization'];
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // ── 1. Try access token ──────────────────────────────────────────────────
  if (accessToken) {
    try {
      req.user = verifyAccessToken(accessToken);
      return next();
    } catch (err) {
      if (err.name !== 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Invalid access token' });
      }
      // Expired — fall through to silent refresh
    }
  }

  // ── 2. Try refresh token cookie ──────────────────────────────────────────
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);

    // FIX: was `isRefreshTokenValid(decoded.jti)` — missing first argument.
    //      Function signature is (userId, jti); passing only jti meant userId
    //      was always the jti value and jti was undefined, so the Redis key was
    //      always wrong and every valid token looked revoked.
    // FIX: missing `await` — all four token-store calls below are async;
    //      without await they fire-and-forget, so revocation and rotation
    //      never actually complete before the response is sent.
    const valid = await isRefreshTokenValid(decoded.id, decoded.jti);
    if (!valid) {
      await revokeAllForUser(decoded.id);
      return res.status(401).json({
        success: false,
        message: 'Refresh token reuse detected. Please log in again.',
      });
    }

    // ── 3. Rotate tokens ─────────────────────────────────────────────────
    await revokeRefreshToken(decoded.id, decoded.jti);

    const payload = { id: decoded.id, email: decoded.email, role: decoded.role };
    const { accessToken: newAccess, refreshToken: newRefresh } = generateTokenPair(payload);

    const newDecoded = verifyRefreshToken(newRefresh);

    // FIX: was `saveRefreshToken(newDecoded.jti, decoded.id)` — args swapped.
    //      Signature is (userId, jti, ttlSeconds). Also added REFRESH_TTL_SEC
    //      so the Redis TTL actually matches the token expiry.
    await saveRefreshToken(decoded.id, newDecoded.jti, REFRESH_TTL_SEC);

    res.cookie('refreshToken', newRefresh, REFRESH_COOKIE_OPTIONS);
    res.setHeader('X-New-Access-Token', newAccess);

    req.user = payload;
    return next();
  } catch (err) {
    console.error('[AUTH ERROR]', err.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
    });
  }
};

// ---------------------------------------------------------------------------
// requireRole — used by routers: router.use(authenticate, requireRole('admin'))
// ---------------------------------------------------------------------------

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }
  next();
};

// ---------------------------------------------------------------------------
// authorizeAdmin — backwards compatibility alias for requireRole('admin')
// ---------------------------------------------------------------------------

export const authorizeAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};