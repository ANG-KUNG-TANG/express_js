/**
 * oauth_user.uc.test.js
 *
 * Tests for findOrCreateOAuthUser use-case.
 * No external dependencies — userRepo is a plain mock object.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const { findOrCreateOAuthUser } = await import('../../../app/auth_uc/oauth_user.uc.js');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const googleProfile = {
    provider:    'google',
    id:          'google-id-123',
    displayName: 'Alice Smith',
    emails:      [{ value: 'alice@gmail.com' }],
    photos:      [{ value: 'https://photo.url/alice.jpg' }],
};

const githubProfile = {
    provider:    'github',
    id:          'github-id-456',
    username:    'alicehub',
    displayName: '',          // GitHub sometimes returns empty string
    emails:      [{ value: 'alice@github.com' }],
    photos:      [],
};

const githubProfileJsonEmail = {
    provider:    'github',
    id:          'github-id-789',
    username:    'bobhub',
    displayName: '',
    emails:      [],           // no emails array — falls back to _json.email
    _json:       { email: 'bob@github.com' },
    photos:      [],
};

const profileNoEmail = {
    provider:    'google',
    id:          'google-no-email',
    displayName: 'No Email User',
    emails:      [],
    _json:       {},
    photos:      [],
};

// ---------------------------------------------------------------------------
// Repo factory
// ---------------------------------------------------------------------------

const makeRepo = ({ existing = null } = {}) => ({
    findByEmail: jest.fn().mockResolvedValue(existing),
    create:      jest.fn().mockImplementation(async (data) => ({ id: 'new-id', ...data })),
});

// ---------------------------------------------------------------------------
// findOrCreateOAuthUser — existing user
// ---------------------------------------------------------------------------

describe('findOrCreateOAuthUser — existing user', () => {
    let repo;

    beforeEach(() => {
        repo = makeRepo({ existing: { id: 'existing-1', email: 'alice@gmail.com' } });
    });

    it('calls findByEmail with the normalised email', async () => {
        const handler = findOrCreateOAuthUser(repo);
        await handler(googleProfile);
        expect(repo.findByEmail).toHaveBeenCalledWith('alice@gmail.com');
    });

    it('returns the existing user without calling create', async () => {
        const handler = findOrCreateOAuthUser(repo);
        const result  = await handler(googleProfile);
        expect(result).toEqual({ id: 'existing-1', email: 'alice@gmail.com' });
        expect(repo.create).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// findOrCreateOAuthUser — new user (Google)
// ---------------------------------------------------------------------------

describe('findOrCreateOAuthUser — new Google user', () => {
    let repo;

    beforeEach(() => { repo = makeRepo(); });

    it('calls create when no existing user is found', async () => {
        await findOrCreateOAuthUser(repo)(googleProfile);
        expect(repo.create).toHaveBeenCalledTimes(1);
    });

    it('creates with correct provider fields', async () => {
        await findOrCreateOAuthUser(repo)(googleProfile);
        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                provider:   'google',
                providerId: 'google-id-123',
            })
        );
    });

    it('creates with correct name and email', async () => {
        await findOrCreateOAuthUser(repo)(googleProfile);
        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                name:  'Alice Smith',
                email: 'alice@gmail.com',
            })
        );
    });

    it('creates with the avatar URL from photos[0]', async () => {
        await findOrCreateOAuthUser(repo)(googleProfile);
        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({ avatarUrl: 'https://photo.url/alice.jpg' })
        );
    });

    it('creates with null password (OAuth users have no password)', async () => {
        await findOrCreateOAuthUser(repo)(googleProfile);
        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({ password: null })
        );
    });

    it('creates with role "user"', async () => {
        await findOrCreateOAuthUser(repo)(googleProfile);
        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({ role: 'user' })
        );
    });

    it('returns the newly created user', async () => {
        const result = await findOrCreateOAuthUser(repo)(googleProfile);
        expect(result).toMatchObject({ email: 'alice@gmail.com', provider: 'google' });
        expect(result.id).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// findOrCreateOAuthUser — new user (GitHub)
// ---------------------------------------------------------------------------

describe('findOrCreateOAuthUser — new GitHub user', () => {
    let repo;

    beforeEach(() => { repo = makeRepo(); });

    it('reads email from emails[0].value for GitHub profiles', async () => {
        await findOrCreateOAuthUser(repo)(githubProfile);
        expect(repo.findByEmail).toHaveBeenCalledWith('alice@github.com');
    });

    it('falls back to username when displayName is empty', async () => {
        await findOrCreateOAuthUser(repo)(githubProfile);
        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'alicehub' })
        );
    });

    it('sets avatarUrl to null when photos array is empty', async () => {
        await findOrCreateOAuthUser(repo)(githubProfile);
        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({ avatarUrl: null })
        );
    });

    it('sets provider to "github"', async () => {
        await findOrCreateOAuthUser(repo)(githubProfile);
        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({ provider: 'github', providerId: 'github-id-456' })
        );
    });
});

// ---------------------------------------------------------------------------
// Email fallback — _json.email
// ---------------------------------------------------------------------------

describe('findOrCreateOAuthUser — _json.email fallback', () => {
    it('uses _json.email when emails array is empty', async () => {
        const repo = makeRepo();
        await findOrCreateOAuthUser(repo)(githubProfileJsonEmail);
        expect(repo.findByEmail).toHaveBeenCalledWith('bob@github.com');
        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({ email: 'bob@github.com' })
        );
    });
});

// ---------------------------------------------------------------------------
// Name fallback — 'Unknown'
// ---------------------------------------------------------------------------

describe('findOrCreateOAuthUser — name fallback', () => {
    it('uses "Unknown" when both displayName and username are absent', async () => {
        const repo    = makeRepo();
        const profile = { ...githubProfile, displayName: '', username: undefined };
        await findOrCreateOAuthUser(repo)(profile);
        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Unknown' })
        );
    });
});

// ---------------------------------------------------------------------------
// Missing email — throws
// ---------------------------------------------------------------------------

describe('findOrCreateOAuthUser — missing email', () => {
    it('throws when profile has no email in any source', async () => {
        const repo = makeRepo();
        await expect(
            findOrCreateOAuthUser(repo)(profileNoEmail)
        ).rejects.toThrow('did not return an email address');
    });

    it('does not call findByEmail or create when email is missing', async () => {
        const repo = makeRepo();
        await expect(
            findOrCreateOAuthUser(repo)(profileNoEmail)
        ).rejects.toThrow();
        expect(repo.findByEmail).not.toHaveBeenCalled();
        expect(repo.create).not.toHaveBeenCalled();
    });

    it('includes the provider name in the error message', async () => {
        const repo = makeRepo();
        await expect(
            findOrCreateOAuthUser(repo)(profileNoEmail)
        ).rejects.toThrow('google');
    });
});

// ---------------------------------------------------------------------------
// Repo error propagation
// ---------------------------------------------------------------------------

describe('findOrCreateOAuthUser — repo error propagation', () => {
    it('propagates errors thrown by findByEmail', async () => {
        const repo = {
            findByEmail: jest.fn().mockRejectedValue(new Error('DB connection failed')),
            create:      jest.fn(),
        };
        await expect(
            findOrCreateOAuthUser(repo)(googleProfile)
        ).rejects.toThrow('DB connection failed');
        expect(repo.create).not.toHaveBeenCalled();
    });

    it('propagates errors thrown by create', async () => {
        const repo = {
            findByEmail: jest.fn().mockResolvedValue(null),
            create:      jest.fn().mockRejectedValue(new Error('Duplicate email')),
        };
        await expect(
            findOrCreateOAuthUser(repo)(googleProfile)
        ).rejects.toThrow('Duplicate email');
    });
});

// ---------------------------------------------------------------------------
// Currying — repo is injected once, handler is reusable
// ---------------------------------------------------------------------------

describe('findOrCreateOAuthUser — currying', () => {
    it('returns a function when called with the repo', () => {
        const repo    = makeRepo();
        const handler = findOrCreateOAuthUser(repo);
        expect(typeof handler).toBe('function');
    });

    it('the returned handler is async', () => {
        const repo    = makeRepo();
        const handler = findOrCreateOAuthUser(repo);
        const result  = handler(googleProfile);
        expect(result).toBeInstanceOf(Promise);
        return result; // let Jest await it cleanly
    });

    it('same handler instance can process multiple profiles', async () => {
        const repo    = makeRepo();
        const handler = findOrCreateOAuthUser(repo);

        await handler(googleProfile);
        await handler(githubProfile);

        expect(repo.findByEmail).toHaveBeenCalledTimes(2);
        expect(repo.findByEmail).toHaveBeenCalledWith('alice@gmail.com');
        expect(repo.findByEmail).toHaveBeenCalledWith('alice@github.com');
    });
});