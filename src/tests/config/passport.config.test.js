/**
 * passport.config.test.js
 *
 * Tests initPassport() in isolation.
 *
 * MUST be a separate file from auth.test.js — Jest ESM gives each test file
 * its own module registry, so unstable_mockModule calls here intercept the
 * strategy constructors before passport.config.js is ever imported.
 * Putting these tests inside auth.test.js would fail because passport.config.js
 * would already be cached with the real strategy constructors.
 */

import { jest, beforeEach, describe, it, expect } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mocks — all must appear before any dynamic import
// ---------------------------------------------------------------------------

jest.unstable_mockModule('passport', () => {
    const passport = {
        use:          jest.fn(),
        authenticate: jest.fn(),
        initialize:   jest.fn(() => (_req, _res, next) => next()),
    };
    return { default: passport };
});

// Mock the strategy packages so their constructors never touch OAuth2Strategy
// (which throws if clientID is missing). We use named constructor functions so
// that constructor.name is preserved for the assertions below.
jest.unstable_mockModule('passport-google-oauth20', () => {
    function GoogleStrategy(options, verify) {
        this.name    = 'google';
        this.options = options;
        this.verify  = verify;
    }
    return { Strategy: GoogleStrategy };
});

jest.unstable_mockModule('passport-github2', () => {
    function GithubStrategy(options, verify) {
        this.name    = 'github';
        this.options = options;
        this.verify  = verify;
    }
    return { Strategy: GithubStrategy };
});

// oauth_user.uc and user_repo are imported transitively by passport.config;
// mock them so the test has no database dependency.
jest.unstable_mockModule('../../app/auth_uc/oauth_user.uc.js', () => ({
    findOrCreateOAuthUser: jest.fn(() => jest.fn()),
}));

jest.unstable_mockModule('../../infrastructure/repositories/user_repo.js', () => ({}));

// ---------------------------------------------------------------------------
// Dynamic imports AFTER mocks
// ---------------------------------------------------------------------------

const { default: passport }  = await import('passport');
const { initPassport }        = await import('../../config/passport.config.js');

// ---------------------------------------------------------------------------
// Helpers — passport.use() is called two ways in the source:
//   passport.use(new GoogleStrategy(...))          → args: [strategy]
//   passport.use('github', new GithubStrategy(...))→ args: ['github', strategy]
// ---------------------------------------------------------------------------

/** Extracts the constructor name regardless of call signature. */
const getStrategyName = (args) => {
    const obj = typeof args[0] === 'object' ? args[0] : args[1];
    return obj?.constructor?.name ?? null;
};

/** Finds the strategy instance registered under the given constructor name. */
const getStrategy = (name) => {
    const call = passport.use.mock.calls.find((args) => getStrategyName(args) === name);
    if (!call) throw new Error(`No strategy with constructor name "${name}" was registered`);
    return typeof call[0] === 'object' ? call[0] : call[1];
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('passport.config — initPassport', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns the passport instance', () => {
        const result = initPassport();
        expect(result).toBe(passport);
    });

    it('calls passport.use exactly twice (one per provider)', () => {
        initPassport();
        expect(passport.use).toHaveBeenCalledTimes(2);
    });

    it('registers a GoogleStrategy', () => {
        initPassport();
        const names = passport.use.mock.calls.map(
            (c) => c[0]?.constructor?.name ?? c[1]?.constructor?.name
        );
        expect(names).toContain('GoogleStrategy');
    });

    it('registers a GithubStrategy', () => {
        initPassport();
        const names = passport.use.mock.calls.map(getStrategyName);
        expect(names).toContain('GithubStrategy');
    });

    it('configures Google with profile and email scope', () => {
        initPassport();
        const strategy = getStrategy('GoogleStrategy');
        expect(strategy.options.scope).toEqual(expect.arrayContaining(['profile', 'email']));
    });

    it('configures GitHub with user:email scope', () => {
        initPassport();
        const strategy = getStrategy('GithubStrategy');
        expect(strategy.options.scope).toEqual(expect.arrayContaining(['user:email']));
    });

    it('uses GOOGLE_CALLBACK_URL env var when set', () => {
        process.env.GOOGLE_CALLBACK_URL = 'https://example.com/auth/google/callback';
        initPassport();
        const strategy = getStrategy('GoogleStrategy');
        expect(strategy.options.callbackURL).toBe('https://example.com/auth/google/callback');
        delete process.env.GOOGLE_CALLBACK_URL;
    });

    it('falls back to /auth/google/callback when GOOGLE_CALLBACK_URL is unset', () => {
        delete process.env.GOOGLE_CALLBACK_URL;
        initPassport();
        const strategy = getStrategy('GoogleStrategy');
        expect(strategy.options.callbackURL).toBe('/auth/google/callback');
    });
});