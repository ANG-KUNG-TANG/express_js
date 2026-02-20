import { verifyAccessToken, verifyRefreshToken, generateTokenPair } from '../core/services/jwt.service.js';
import { isRefreshTokenValid, revokeRefreshToken, saveRefreshToken, revokeAllForUser } from '../core/services/token_store.service.js';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   7 * 24 * 60 * 60 * 1000,
};

export const authenticate = (req, res, next) => {
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

    if (!isRefreshTokenValid(decoded.jti)) {
      revokeAllForUser(decoded.id);
      return res.status(401).json({
        success: false,
        message: 'Refresh token reuse detected. Please log in again.',
      });
    }

    // ── 3. Rotate tokens ───────────────────────────────────────────────────
    revokeRefreshToken(decoded.jti);

    const payload = { id: decoded.id, email: decoded.email, role: decoded.role };
    const { accessToken: newAccess, refreshToken: newRefresh } = generateTokenPair(payload);

    const newDecoded = verifyRefreshToken(newRefresh);
    saveRefreshToken(newDecoded.jti, decoded.id);

    res.cookie('refreshToken', newRefresh, REFRESH_COOKIE_OPTIONS);
    res.setHeader('X-New-Access-Token', newAccess);

    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

export const authorizeAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};