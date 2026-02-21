/**
 * token_store.service.test.js
 *
 * Tests the in-memory refresh token store.
 * No mocks needed — the store is pure in-memory logic with no external deps.
 *
 * NOTE: The store is a module-level Map. Jest isolates modules per test file,
 * so the store starts empty for this suite. We clear it between tests via
 * revokeAllForUser or direct revocation calls.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

const {
    saveRefreshToken,
    isRefreshTokenValid,
    revokeRefreshToken,
    revokeAllForUser,
} = await import('../../core/services/token_store.service.js');

// Helpers
const jti  = (n) => `jti-${n}`;
const user = (n) => `user-${n}`;

// Clear the store before each test by revoking known jtis.
// We track what we save so we can clean up.
let saved = [];
const save = (j, u) => { saveRefreshToken(j, u); saved.push(j); };
beforeEach(() => {
    saved.forEach(revokeRefreshToken);
    saved = [];
});

// ---------------------------------------------------------------------------
// saveRefreshToken
// ---------------------------------------------------------------------------

describe('saveRefreshToken', () => {
    it('makes the jti valid after saving', () => {
        save(jti(1), user(1));
        expect(isRefreshTokenValid(jti(1))).toBe(true);
    });

    it('stores multiple jtis independently', () => {
        save(jti(1), user(1));
        save(jti(2), user(2));
        expect(isRefreshTokenValid(jti(1))).toBe(true);
        expect(isRefreshTokenValid(jti(2))).toBe(true);
    });

    it('overwrites an existing jti without error', () => {
        save(jti(1), user(1));
        save(jti(1), user(2)); // same jti, different user
        expect(isRefreshTokenValid(jti(1))).toBe(true);
    });

    it('allows the same user to have multiple jtis (multiple sessions)', () => {
        save(jti(1), user(1));
        save(jti(2), user(1));
        expect(isRefreshTokenValid(jti(1))).toBe(true);
        expect(isRefreshTokenValid(jti(2))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// isRefreshTokenValid
// ---------------------------------------------------------------------------

describe('isRefreshTokenValid', () => {
    it('returns false for a jti that was never saved', () => {
        expect(isRefreshTokenValid('never-saved-jti')).toBe(false);
    });

    it('returns true for a saved jti', () => {
        save(jti(10), user(1));
        expect(isRefreshTokenValid(jti(10))).toBe(true);
    });

    it('returns false after the jti has been revoked', () => {
        save(jti(11), user(1));
        revokeRefreshToken(jti(11));
        expect(isRefreshTokenValid(jti(11))).toBe(false);
    });

    it('does not affect other jtis when one is revoked', () => {
        save(jti(12), user(1));
        save(jti(13), user(1));
        revokeRefreshToken(jti(12));
        expect(isRefreshTokenValid(jti(13))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// revokeRefreshToken
// ---------------------------------------------------------------------------

describe('revokeRefreshToken', () => {
    it('invalidates the revoked jti', () => {
        save(jti(20), user(2));
        revokeRefreshToken(jti(20));
        expect(isRefreshTokenValid(jti(20))).toBe(false);
    });

    it('does not throw when revoking a non-existent jti', () => {
        expect(() => revokeRefreshToken('ghost-jti')).not.toThrow();
    });

    it('only removes the specified jti, not others for the same user', () => {
        save(jti(21), user(2));
        save(jti(22), user(2));
        revokeRefreshToken(jti(21));
        expect(isRefreshTokenValid(jti(21))).toBe(false);
        expect(isRefreshTokenValid(jti(22))).toBe(true);
        // cleanup
        revokeRefreshToken(jti(22));
    });

    it('is idempotent — revoking twice does not throw', () => {
        save(jti(23), user(2));
        revokeRefreshToken(jti(23));
        expect(() => revokeRefreshToken(jti(23))).not.toThrow();
        expect(isRefreshTokenValid(jti(23))).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// revokeAllForUser
// ---------------------------------------------------------------------------

describe('revokeAllForUser', () => {
    it('invalidates all jtis belonging to the target user', () => {
        save(jti(30), user(3));
        save(jti(31), user(3));
        save(jti(32), user(3));

        revokeAllForUser(user(3));

        expect(isRefreshTokenValid(jti(30))).toBe(false);
        expect(isRefreshTokenValid(jti(31))).toBe(false);
        expect(isRefreshTokenValid(jti(32))).toBe(false);
    });

    it('does not revoke jtis belonging to other users', () => {
        save(jti(40), user(4));
        save(jti(41), user(5)); // different user

        revokeAllForUser(user(4));

        expect(isRefreshTokenValid(jti(40))).toBe(false);
        expect(isRefreshTokenValid(jti(41))).toBe(true);

        // cleanup
        revokeRefreshToken(jti(41));
    });

    it('does not throw when the user has no sessions', () => {
        expect(() => revokeAllForUser('user-with-no-sessions')).not.toThrow();
    });

    it('is idempotent — calling twice does not throw', () => {
        save(jti(50), user(6));
        revokeAllForUser(user(6));
        expect(() => revokeAllForUser(user(6))).not.toThrow();
    });

    it('handles a user with a single session correctly', () => {
        save(jti(60), user(7));
        revokeAllForUser(user(7));
        expect(isRefreshTokenValid(jti(60))).toBe(false);
    });

    it('does not affect an empty store', () => {
        // Store is empty at this point (beforeEach cleared saved[])
        expect(() => revokeAllForUser('ghost-user')).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// Token rotation flow (integration-style)
// ---------------------------------------------------------------------------

describe('token rotation flow', () => {
    it('simulates a full rotate: save → validate → revoke old → save new → validate new', () => {
        const OLD_JTI = 'old-jti-rotation';
        const NEW_JTI = 'new-jti-rotation';
        const USER    = 'rotation-user';

        // 1. Initial login: save refresh token
        saveRefreshToken(OLD_JTI, USER);
        expect(isRefreshTokenValid(OLD_JTI)).toBe(true);

        // 2. Token refresh: validate, revoke old, save new
        expect(isRefreshTokenValid(OLD_JTI)).toBe(true);
        revokeRefreshToken(OLD_JTI);
        saveRefreshToken(NEW_JTI, USER);

        // 3. Old is gone, new is valid
        expect(isRefreshTokenValid(OLD_JTI)).toBe(false);
        expect(isRefreshTokenValid(NEW_JTI)).toBe(true);

        // cleanup
        revokeRefreshToken(NEW_JTI);
    });

    it('simulates token reuse detection: reused jti is not in store → revoke all', () => {
        const VALID_JTI = 'valid-jti-reuse';
        const USER      = 'reuse-user';

        saveRefreshToken(VALID_JTI, USER);

        // Attacker presents an already-revoked (old) jti
        const STOLEN_JTI = 'stolen-old-jti';
        expect(isRefreshTokenValid(STOLEN_JTI)).toBe(false); // not in store

        // Server detects reuse → nuke all sessions for that user
        revokeAllForUser(USER);

        expect(isRefreshTokenValid(VALID_JTI)).toBe(false);

        // cleanup (already revoked, just in case)
        revokeRefreshToken(VALID_JTI);
    });
});