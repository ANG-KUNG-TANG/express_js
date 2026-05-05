/**
 * oauth_user.uc.test.js
 *
 * Comprehensive tests for findOrCreateOAuthUser use-case.
 * No external dependencies — userRepo and audit functions are plain mocks.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.unstable_mockModule('../../../core/services/audit.service.js', () => ({
    recordAudit:   jest.fn(),
    recordFailure: jest.fn(),
}));

jest.unstable_mockModule('../../../domain/base/audit_enums.js', () => ({
    AuditAction: {
        AUTH_OAUTH_FAILURE:      'AUTH_OAUTH_FAILURE',
        AUTH_OAUTH_LOGIN_GOOGLE: 'AUTH_OAUTH_LOGIN_GOOGLE',
        AUTH_OAUTH_LOGIN_GITHUB: 'AUTH_OAUTH_LOGIN_GITHUB',
    },
}));

jest.unstable_mockModule('../../../domain/base/user_enums.js', () => ({
    UserRole: { USER: 'user' },
}));

const { findOrCreateOAuthUser } = await import('../../../app/auth_uc/oauth_user.uc.js');
const { recordAudit, recordFailure } = await import('../../../core/services/audit.service.js');

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
    displayName: '',           // empty string – should fall back to username
    emails:      [{ value: 'alice@github.com' }],
    photos:      [],
};

const githubProfileJsonEmail = {
    provider:    'github',
    id:          'github-id-789',
    username:    'bobhub',
    displayName: '',
    emails:      [],           // no emails array → falls back to _json.email
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
    create: jest.fn().mockImplementation(async (user) => ({
        // Extract public properties from the User entity
        // so the returned object behaves like a plain user record.
        id:         'new-id',
        email:      user.email,
        name:       user.name,
        role:       user.role,
        provider:   user.provider,
        providerId: user.providerId,
        avatarUrl:  user.avatarUrl,
    })),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
    recordAudit.mockClear();
    recordFailure.mockClear();
});

// ---------------------------------------------------------------------------
// Existing user – Google
// ---------------------------------------------------------------------------
describe('findOrCreateOAuthUser — existing Google user', () => {
    let repo;

    beforeEach(() => {
        repo = makeRepo({ existing: { id: 'existing-1', email: 'alice@gmail.com' } });
    });

    it('looks up by normalised email', async () => {
        const handler = findOrCreateOAuthUser(repo);
        await handler(googleProfile);
        expect(repo.findByEmail).toHaveBeenCalledWith('alice@gmail.com');
    });

    it('returns the existing user without creating a new one', async () => {
        const handler = findOrCreateOAuthUser(repo);
        const result  = await handler(googleProfile);
        expect(result).toEqual({ id: 'existing-1', email: 'alice@gmail.com' });
        expect(repo.create).not.toHaveBeenCalled();
    });

    it('records an audit event for a returning Google user', async () => {
        const handler = findOrCreateOAuthUser(repo);
        await handler(googleProfile);
        expect(recordAudit).toHaveBeenCalledWith(
            'AUTH_OAUTH_LOGIN_GOOGLE',
            'existing-1',
            {
                email:     'alice@gmail.com',
                provider:  'google',
                isNewUser: false,
            },
            null
        );
    });
});

// ---------------------------------------------------------------------------
// Existing user – GitHub
// ---------------------------------------------------------------------------
describe('findOrCreateOAuthUser — existing GitHub user', () => {
    let repo;

    beforeEach(() => {
        repo = makeRepo({ existing: { id: 'existing-gh', email: 'alice@github.com' } });
    });

    it('records an audit event with the GitHub action', async () => {
        const handler = findOrCreateOAuthUser(repo);
        await handler(githubProfile);
        expect(recordAudit).toHaveBeenCalledWith(
            'AUTH_OAUTH_LOGIN_GITHUB',
            'existing-gh',
            {
                email:     'alice@github.com',
                provider:  'github',
                isNewUser: false,
            },
            null
        );
    });
});

// ---------------------------------------------------------------------------
// New user – Google
// ---------------------------------------------------------------------------
describe('findOrCreateOAuthUser — new Google user', () => {
    let repo;

    beforeEach(() => { repo = makeRepo(); });

    it('calls create when no user is found', async () => {
        await findOrCreateOAuthUser(repo)(googleProfile);
        expect(repo.create).toHaveBeenCalledTimes(1);
    });

    it('forwards all normalised fields including provider and providerId', async () => {
        await findOrCreateOAuthUser(repo)(googleProfile);
        const callArg = repo.create.mock.calls[0][0];
        // The implementation uses `new User({...})`, so the object should contain these
        expect(callArg).toHaveProperty('provider', 'google');
        expect(callArg).toHaveProperty('providerId', 'google-id-123');
    });

    it('creates with correct name, email, avatar, password, and role', async () => {
        await findOrCreateOAuthUser(repo)(googleProfile);
        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                name:      'Alice Smith',
                email:     'alice@gmail.com',
                avatarUrl: 'https://photo.url/alice.jpg',
                password:  expect.stringMatching(/^[0-9a-f]{64}$/),
                role:      'user',
            })
        );
    });

    it('normalises email to lowercase', async () => {
        const profileMixedCase = {
            ...googleProfile,
            emails: [{ value: 'AlIce@Gmail.com' }],
        };
        await findOrCreateOAuthUser(repo)(profileMixedCase);
        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({ email: 'alice@gmail.com' })
        );
    });

    it('records an audit event for a new Google user', async () => {
        const handler = findOrCreateOAuthUser(repo);
        await handler(googleProfile);
        expect(recordAudit).toHaveBeenCalledWith(
            'AUTH_OAUTH_LOGIN_GOOGLE',
            'new-id',
            {
                email:     'alice@gmail.com',
                provider:  'google',
                isNewUser: true,
            },
            null
        );
    });

    it('returns the newly created user', async () => {
        const result = await findOrCreateOAuthUser(repo)(googleProfile);
        expect(result).toMatchObject({ email: 'alice@gmail.com' });
        expect(result.id).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// New user – GitHub
// ---------------------------------------------------------------------------
describe('findOrCreateOAuthUser — new GitHub user', () => {
    let repo;

    beforeEach(() => { repo = makeRepo(); });

    it('reads email from emails[0].value', async () => {
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

    it('forwards provider and providerId to the repo', async () => {
        await findOrCreateOAuthUser(repo)(githubProfile);
        const callArg = repo.create.mock.calls[0][0];
        expect(callArg).toHaveProperty('provider', 'github');
        expect(callArg).toHaveProperty('providerId', 'github-id-456');
    });

    it('normalises email to lowercase', async () => {
        const profileMixed = {
            ...githubProfile,
            emails: [{ value: 'AlIce@GitHub.com' }],
        };
        await findOrCreateOAuthUser(repo)(profileMixed);
        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({ email: 'alice@github.com' })
        );
    });

    it('records an audit event with the GitHub action', async () => {
        await findOrCreateOAuthUser(repo)(githubProfile);
        expect(recordAudit).toHaveBeenCalledWith(
            'AUTH_OAUTH_LOGIN_GITHUB',
            'new-id',
            {
                email:     'alice@github.com',
                provider:  'github',
                isNewUser: true,
            },
            null
        );
    });
});

// ---------------------------------------------------------------------------
// Email fallback – _json.email
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
// Name fallback – 'Unknown'
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
// Missing email – throws and records failure
// ---------------------------------------------------------------------------
describe('findOrCreateOAuthUser — missing email', () => {
    it('throws when no email is found in any source', async () => {
        const repo = makeRepo();
        await expect(
            findOrCreateOAuthUser(repo)(profileNoEmail)
        ).rejects.toThrow('did not return an email address');
    });

    it('does not call findByEmail or create', async () => {
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

    it('records a failure audit event with the provider and reason', async () => {
        const repo = makeRepo();
        await expect(
            findOrCreateOAuthUser(repo)(profileNoEmail)
        ).rejects.toThrow();

        expect(recordFailure).toHaveBeenCalledWith(
            'AUTH_OAUTH_FAILURE',
            null,
            {
                provider: 'google',
                reason:   expect.stringContaining('did not return an email'),
            },
            null
        );
    });
});

// ---------------------------------------------------------------------------
// UserEmailNotFoundError handled – user is created
// ---------------------------------------------------------------------------
describe('findOrCreateOAuthUser — UserEmailNotFoundError handled', () => {
    class UserEmailNotFoundError extends Error {
        constructor() { super('User not found'); this.name = 'UserEmailNotFoundError'; }
    }

    it('creates a new user when findByEmail throws UserEmailNotFoundError', async () => {
        const repo = {
            findByEmail: jest.fn().mockRejectedValue(new UserEmailNotFoundError()),
            create: jest.fn().mockImplementation(async (user) => ({
                id:         'created-after-error',
                email:      user.email,
                name:       user.name,
                role:       user.role,
                provider:   user.provider,
                providerId: user.providerId,
                avatarUrl:  user.avatarUrl,
            })),
        };
        const result = await findOrCreateOAuthUser(repo)(googleProfile);
        expect(repo.create).toHaveBeenCalledTimes(1);
        expect(result.id).toBe('created-after-error');
        expect(result.email).toBe('alice@gmail.com');
    });

    it('propagates other errors from findByEmail', async () => {
        const repo = {
            findByEmail: jest.fn().mockRejectedValue(new Error('DB error')),
            create:      jest.fn(),
        };
        await expect(
            findOrCreateOAuthUser(repo)(googleProfile)
        ).rejects.toThrow('DB error');
        expect(repo.create).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Repo error propagation
// ---------------------------------------------------------------------------
describe('findOrCreateOAuthUser — repo error propagation', () => {
    it('propagates errors from findByEmail (non‑UserEmailNotFound)', async () => {
        const repo = {
            findByEmail: jest.fn().mockRejectedValue(new Error('Connection lost')),
            create:      jest.fn(),
        };
        await expect(
            findOrCreateOAuthUser(repo)(googleProfile)
        ).rejects.toThrow('Connection lost');
        expect(repo.create).not.toHaveBeenCalled();
    });

    it('propagates errors from create', async () => {
        const repo = {
            findByEmail: jest.fn().mockResolvedValue(null),
            create:      jest.fn().mockRejectedValue(new Error('Duplicate key')),
        };
        await expect(
            findOrCreateOAuthUser(repo)(googleProfile)
        ).rejects.toThrow('Duplicate key');
    });
});

// ---------------------------------------------------------------------------
// Currying – repo is injected once, handler is reusable
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
        return result;
    });

    it('same handler can process multiple profiles', async () => {
        const repo    = makeRepo();
        const handler = findOrCreateOAuthUser(repo);

        await handler(googleProfile);
        await handler(githubProfile);

        expect(repo.findByEmail).toHaveBeenCalledTimes(2);
        expect(repo.findByEmail).toHaveBeenCalledWith('alice@gmail.com');
        expect(repo.findByEmail).toHaveBeenCalledWith('alice@github.com');
    });
});

// ---------------------------------------------------------------------------
// Additional edge cases
// ---------------------------------------------------------------------------
describe('findOrCreateOAuthUser — edge cases', () => {
    it('handles displayName being undefined (not just empty string)', async () => {
        const repo    = makeRepo();
        const profile = { ...githubProfile, displayName: undefined, username: 'gh-username' };
        await findOrCreateOAuthUser(repo)(profile);
        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'gh-username' })
        );
    });

    it('passes null req to audit functions when not provided', async () => {
        const repo    = makeRepo({ existing: { id: 'ex-1', email: 'alice@gmail.com' } });
        const handler = findOrCreateOAuthUser(repo);
        await handler(googleProfile);
        expect(recordAudit).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(String),
            expect.any(Object),
            null
        );
    });

    it('passes req through to audit functions when provided', async () => {
        const repo    = makeRepo({ existing: { id: 'ex-1', email: 'alice@gmail.com' } });
        const req     = { ip: '127.0.0.1' };
        const handler = findOrCreateOAuthUser(repo);
        await handler(googleProfile, req);
        expect(recordAudit).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(String),
            expect.any(Object),
            req
        );
    });
});