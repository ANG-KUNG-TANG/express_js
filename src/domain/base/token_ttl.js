/**
 * token_ttl.js
 * src/domain/base/token_ttl.js
 *
 * Single source of truth for every token TTL in the system.
 * Import from here — never hardcode durations in use-cases or services.
 *
 * Naming convention:
 *   _MS  = milliseconds  (used with new Date(Date.now() + TTL_MS) for DB expiresAt)
 *   _SEC = seconds       (used for Redis SETEX / jwt expiresIn as number)
 *   _STR = string        (used for jwt expiresIn shorthand e.g. '15m', '7d')
 */

// ── JWT tokens ────────────────────────────────────────────────────────────────

export const ACCESS_TOKEN_TTL_STR  = process.env.JWT_ACCESS_EXPIRY  || '15m';
export const REFRESH_TOKEN_TTL_STR = process.env.JWT_REFRESH_EXPIRY || '7d';

// Numeric seconds — used for Redis SETEX and cookie maxAge calculations.
// jwt.service.js parseTtl() already handles the conversion; import from there
// if you need the parsed value. These are kept here as the canonical defaults.
export const ACCESS_TOKEN_TTL_SEC  = 15 * 60;           // 15 minutes
export const REFRESH_TOKEN_TTL_SEC = 7 * 24 * 60 * 60;  // 7 days

// ── Email verification token ──────────────────────────────────────────────────
// Used in: create_user.uc.js, oauth_user.uc.js, auth.controller.js (resend)

export const EMAIL_VERIFY_TTL_MS  = 24 * 60 * 60 * 1000;  // 24 hours
export const EMAIL_VERIFY_TTL_SEC = 24 * 60 * 60;

// ── Password reset token ──────────────────────────────────────────────────────
// Used in: request_password_reset.uc.js, reset_password.uc.js

export const PASSWORD_RESET_TTL_MS  = 60 * 60 * 1000;  // 1 hour
export const PASSWORD_RESET_TTL_SEC = 60 * 60;

// ── Cookie maxAge ─────────────────────────────────────────────────────────────
// Used in: auth.service.js cookie options
// These mirror the JWT TTLs — keep them in sync.

export const ACCESS_COOKIE_MAX_AGE_MS  = ACCESS_TOKEN_TTL_SEC  * 1000;  // 15 min
export const REFRESH_COOKIE_MAX_AGE_MS = REFRESH_TOKEN_TTL_SEC * 1000;  // 7 days