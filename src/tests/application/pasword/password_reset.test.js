// src/tests/application/pasword/password_reset.test.js

import { jest }  from '@jest/globals';
import crypto    from 'crypto';

// ═════════════════════════════════════════════════════════════════════════════
// Mocks
// ═════════════════════════════════════════════════════════════════════════════

jest.mock('../../../infrastructure/repositories/password_reset_token_repo.js', () => ({
    passwordResetTokenRepo: {
        invalidateAllForUser: jest.fn(),
        create:               jest.fn(),
        findByHash:           jest.fn(),
        save:                 jest.fn(),
    },
}));

jest.mock('../../../infrastructure/repositories/user_repo.js', () => ({
    findByEmail:    jest.fn(),
    updatePassword: jest.fn(),
}));

jest.mock('../../../core/services/email.service.js', () => ({
    emailService: {
        sendPasswordResetEmail: jest.fn(),
    },
}));

jest.mock('../../../core/services/audit.service.js', () => ({
    recordAudit:   jest.fn(),
    recordFailure: jest.fn(),
}));

jest.mock('../../../app/notification/send_noti.uc.js', () => ({
    sendNotificationUseCase: jest.fn(),
}));

jest.mock('../../../app/validators/password_hash.js', () => ({
    hashPassword: jest.fn(),
}));

jest.mock('../../../domain/entities/password_reset_token_entity.js', () => {
    class PasswordResetToken {
        constructor(data) { Object.assign(this, data); }
    }
    return { PasswordResetToken };
});

jest.mock('../../../domain/entities/notificaiton_entity.js', () => ({
    NotificationType: { PASSWORD_CHANGED: 'PASSWORD_CHANGED' },
}));

jest.mock('../../../domain/base/audit_enums.js', () => ({
    AuditAction: {
        AUTH_PASSWORD_RESET_REQUEST: 'AUTH_PASSWORD_RESET_REQUEST',
        AUTH_PASSWORD_RESET_DONE:    'AUTH_PASSWORD_RESET_DONE',
    },
}));

jest.mock('../../../core/errors/password_reset.errors.js', () => {
    const make = (name) => {
        const E = class extends Error {
            constructor(msg = name) { super(msg); this.name = name; }
        };
        Object.defineProperty(E, 'name', { value: name });
        return E;
    };
    return {
        PasswordResetUserNotFoundError:     make('PasswordResetUserNotFoundError'),
        PasswordResetTokenNotFoundError:    make('PasswordResetTokenNotFoundError'),
        PasswordResetTokenExpiredError:     make('PasswordResetTokenExpiredError'),
        PasswordResetTokenAlreadyUsedError: make('PasswordResetTokenAlreadyUsedError'),
    };
});

// ─── Lazy imports ─────────────────────────────────────────────────────────────

const { passwordResetTokenRepo } =
    await import('../../../infrastructure/repositories/password_reset_token_repo.js');
const userRepo =
    await import('../../../infrastructure/repositories/user_repo.js');
const { emailService } =
    await import('../../../core/services/email.service.js');
const { recordAudit, recordFailure } =
    await import('../../../core/services/audit.service.js');
const { sendNotificationUseCase } =
    await import('../../../app/notification/send_noti.uc.js');
const { hashPassword } =
    await import('../../../app/validators/password_hash.js');
const {
    PasswordResetUserNotFoundError,
    PasswordResetTokenNotFoundError,
    PasswordResetTokenExpiredError,
    PasswordResetTokenAlreadyUsedError,
} = await import('../../../core/errors/password_reset.errors.js');

const { requestPasswordResetUseCase } =
    await import('../../../app/password_reset_uc/request_password_reset.uc.js');
const { resetPasswordUseCase } =
    await import('../../../app/password_reset_uc/reset_password.uc.js');
const { validateResetTokenUseCase } =
    await import('../../../app/password_reset_uc/validate_reset_token.us.js');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeUser = (overrides = {}) => ({
    id:    'user-123',
    email: 'jane@example.com',
    name:  'Jane Doe',
    ...overrides,
});

const makeTokenEntity = (overrides = {}) => ({
    userId:      'user-123',
    tokenHash:   'some-hash',
    expiresAt:   new Date(Date.now() + 30 * 60 * 1000),
    used:        false,
    assertValid: jest.fn(),
    markUsed:    jest.fn(),
    ...overrides,
});

const sha256 = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

// ═════════════════════════════════════════════════════════════════════════════
// 1. requestPasswordResetUseCase
// ═════════════════════════════════════════════════════════════════════════════
describe('requestPasswordResetUseCase', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns the generic success message', async () => {
        userRepo.findByEmail.mockResolvedValue(makeUser());
        passwordResetTokenRepo.invalidateAllForUser.mockResolvedValue(undefined);
        passwordResetTokenRepo.create.mockResolvedValue(undefined);
        emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

        const result = await requestPasswordResetUseCase({ email: 'Jane@Example.COM' });
        expect(result.message).toMatch(/reset link has been sent/i);
    });

    it('lowercases the email before looking up the user', async () => {
        userRepo.findByEmail.mockResolvedValue(makeUser());
        passwordResetTokenRepo.invalidateAllForUser.mockResolvedValue(undefined);
        passwordResetTokenRepo.create.mockResolvedValue(undefined);
        emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

        await requestPasswordResetUseCase({ email: 'JANE@EXAMPLE.COM' });
        expect(userRepo.findByEmail).toHaveBeenCalledWith('jane@example.com');
    });

    it('invalidates all previous tokens before creating a new one', async () => {
        userRepo.findByEmail.mockResolvedValue(makeUser());
        passwordResetTokenRepo.invalidateAllForUser.mockResolvedValue(undefined);
        passwordResetTokenRepo.create.mockResolvedValue(undefined);
        emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

        await requestPasswordResetUseCase({ email: 'jane@example.com' });

        expect(passwordResetTokenRepo.invalidateAllForUser).toHaveBeenCalledWith('user-123');
        const invalidateOrder = passwordResetTokenRepo.invalidateAllForUser.mock.invocationCallOrder[0];
        const createOrder     = passwordResetTokenRepo.create.mock.invocationCallOrder[0];
        expect(createOrder).toBeGreaterThan(invalidateOrder);
    });

    it('stores only the SHA-256 hash — never the raw token', async () => {
        userRepo.findByEmail.mockResolvedValue(makeUser());
        passwordResetTokenRepo.invalidateAllForUser.mockResolvedValue(undefined);
        passwordResetTokenRepo.create.mockResolvedValue(undefined);
        emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

        await requestPasswordResetUseCase({ email: 'jane@example.com' });

        const tokenEntity = passwordResetTokenRepo.create.mock.calls[0][0];
        expect(tokenEntity.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('sends a password-reset email with the raw token', async () => {
        userRepo.findByEmail.mockResolvedValue(makeUser());
        passwordResetTokenRepo.invalidateAllForUser.mockResolvedValue(undefined);
        passwordResetTokenRepo.create.mockResolvedValue(undefined);
        emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

        await requestPasswordResetUseCase({ email: 'jane@example.com' });

        expect(emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
        const emailArg = emailService.sendPasswordResetEmail.mock.calls[0][0];
        expect(emailArg.toEmail).toBe('jane@example.com');
        expect(emailArg.userName).toBe('Jane Doe');
        expect(emailArg.rawToken).toMatch(/^[a-f0-9]{64}$/);
    });

    it('records a success audit after sending the email', async () => {
        userRepo.findByEmail.mockResolvedValue(makeUser());
        passwordResetTokenRepo.invalidateAllForUser.mockResolvedValue(undefined);
        passwordResetTokenRepo.create.mockResolvedValue(undefined);
        emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

        const mockReq = { ip: '1.2.3.4' };
        await requestPasswordResetUseCase({ email: 'jane@example.com' }, mockReq);

        expect(recordAudit).toHaveBeenCalledWith(
            'AUTH_PASSWORD_RESET_REQUEST',
            'user-123',
            expect.objectContaining({ email: 'jane@example.com' }),
            mockReq,
        );
    });

    it('uses user._id as fallback when user.id is absent', async () => {
        const user = { _id: 'user-456', email: 'jane@example.com', name: 'Jane' };
        userRepo.findByEmail.mockResolvedValue(user);
        passwordResetTokenRepo.invalidateAllForUser.mockResolvedValue(undefined);
        passwordResetTokenRepo.create.mockResolvedValue(undefined);
        emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

        await requestPasswordResetUseCase({ email: 'jane@example.com' });
        expect(passwordResetTokenRepo.invalidateAllForUser).toHaveBeenCalledWith('user-456');
    });

    it('sets token expiry ~30 minutes in the future', async () => {
        userRepo.findByEmail.mockResolvedValue(makeUser());
        passwordResetTokenRepo.invalidateAllForUser.mockResolvedValue(undefined);
        passwordResetTokenRepo.create.mockResolvedValue(undefined);
        emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

        const before = Date.now();
        await requestPasswordResetUseCase({ email: 'jane@example.com' });
        const after  = Date.now();

        const tokenEntity = passwordResetTokenRepo.create.mock.calls[0][0];
        const expiryMs    = tokenEntity.expiresAt.getTime();
        expect(expiryMs).toBeGreaterThanOrEqual(before + 30 * 60 * 1000);
        expect(expiryMs).toBeLessThanOrEqual(after  + 30 * 60 * 1000);
    });

    it('throws PasswordResetUserNotFoundError when email is not registered', async () => {
        userRepo.findByEmail.mockResolvedValue(null);
        await expect(requestPasswordResetUseCase({ email: 'ghost@example.com' }))
            .rejects.toThrow(PasswordResetUserNotFoundError);
    });

    it('records a failure audit when the email is not found', async () => {
        userRepo.findByEmail.mockResolvedValue(null);
        await expect(requestPasswordResetUseCase({ email: 'ghost@example.com' }, null)).rejects.toThrow();
        expect(recordFailure).toHaveBeenCalledWith(
            'AUTH_PASSWORD_RESET_REQUEST',
            null,
            expect.objectContaining({ reason: 'email not found' }),
            null,
        );
    });

    it('does NOT send an email when the user is not found', async () => {
        userRepo.findByEmail.mockResolvedValue(null);
        await expect(requestPasswordResetUseCase({ email: 'ghost@example.com' })).rejects.toThrow();
        expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('does NOT create a token when the user is not found', async () => {
        userRepo.findByEmail.mockResolvedValue(null);
        await expect(requestPasswordResetUseCase({ email: 'ghost@example.com' })).rejects.toThrow();
        expect(passwordResetTokenRepo.create).not.toHaveBeenCalled();
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. resetPasswordUseCase
// ═════════════════════════════════════════════════════════════════════════════
describe('resetPasswordUseCase', () => {
    const RAW_TOKEN = 'a'.repeat(64);

    beforeEach(() => jest.clearAllMocks());

    it('returns the success message', async () => {
        const tokenEntity = makeTokenEntity();
        passwordResetTokenRepo.findByHash.mockResolvedValue(tokenEntity);
        hashPassword.mockResolvedValue('hashed-pw');
        userRepo.updatePassword.mockResolvedValue(undefined);
        passwordResetTokenRepo.save.mockResolvedValue(undefined);
        sendNotificationUseCase.mockResolvedValue(undefined);

        const result = await resetPasswordUseCase({ rawToken: RAW_TOKEN, password: 'NewPass1!' });
        expect(result.message).toMatch(/reset successfully/i);
    });

    it('looks up the token by SHA-256 hash of the raw token', async () => {
        const tokenEntity = makeTokenEntity();
        passwordResetTokenRepo.findByHash.mockResolvedValue(tokenEntity);
        hashPassword.mockResolvedValue('hashed-pw');
        userRepo.updatePassword.mockResolvedValue(undefined);
        passwordResetTokenRepo.save.mockResolvedValue(undefined);
        sendNotificationUseCase.mockResolvedValue(undefined);

        await resetPasswordUseCase({ rawToken: RAW_TOKEN, password: 'NewPass1!' });
        expect(passwordResetTokenRepo.findByHash).toHaveBeenCalledWith(sha256(RAW_TOKEN));
    });

    it('hashes the new password before storing it', async () => {
        const tokenEntity = makeTokenEntity();
        passwordResetTokenRepo.findByHash.mockResolvedValue(tokenEntity);
        hashPassword.mockResolvedValue('$bcrypt$hashed');
        userRepo.updatePassword.mockResolvedValue(undefined);
        passwordResetTokenRepo.save.mockResolvedValue(undefined);
        sendNotificationUseCase.mockResolvedValue(undefined);

        await resetPasswordUseCase({ rawToken: RAW_TOKEN, password: 'NewPass1!' });
        expect(hashPassword).toHaveBeenCalledWith('NewPass1!');
        expect(userRepo.updatePassword).toHaveBeenCalledWith('user-123', '$bcrypt$hashed');
    });

    it('marks the token as used and saves it', async () => {
        const tokenEntity = makeTokenEntity();
        passwordResetTokenRepo.findByHash.mockResolvedValue(tokenEntity);
        hashPassword.mockResolvedValue('hashed-pw');
        userRepo.updatePassword.mockResolvedValue(undefined);
        passwordResetTokenRepo.save.mockResolvedValue(undefined);
        sendNotificationUseCase.mockResolvedValue(undefined);

        await resetPasswordUseCase({ rawToken: RAW_TOKEN, password: 'NewPass1!' });
        expect(tokenEntity.markUsed).toHaveBeenCalledTimes(1);
        expect(passwordResetTokenRepo.save).toHaveBeenCalledWith(tokenEntity);
    });

    it('records a success audit after the password is updated', async () => {
        const tokenEntity = makeTokenEntity();
        passwordResetTokenRepo.findByHash.mockResolvedValue(tokenEntity);
        hashPassword.mockResolvedValue('hashed-pw');
        userRepo.updatePassword.mockResolvedValue(undefined);
        passwordResetTokenRepo.save.mockResolvedValue(undefined);
        sendNotificationUseCase.mockResolvedValue(undefined);

        const mockReq = { ip: '9.9.9.9' };
        await resetPasswordUseCase({ rawToken: RAW_TOKEN, password: 'NewPass1!' }, mockReq);
        expect(recordAudit).toHaveBeenCalledWith('AUTH_PASSWORD_RESET_DONE', 'user-123', {}, mockReq);
    });

    it('fires a PASSWORD_CHANGED notification (fire-and-forget)', async () => {
        const tokenEntity = makeTokenEntity();
        passwordResetTokenRepo.findByHash.mockResolvedValue(tokenEntity);
        hashPassword.mockResolvedValue('hashed-pw');
        userRepo.updatePassword.mockResolvedValue(undefined);
        passwordResetTokenRepo.save.mockResolvedValue(undefined);
        sendNotificationUseCase.mockResolvedValue(undefined);

        await resetPasswordUseCase({ rawToken: RAW_TOKEN, password: 'NewPass1!' });
        expect(sendNotificationUseCase).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 'user-123', type: 'PASSWORD_CHANGED' })
        );
    });

    it('does NOT throw when the confirmation notification fails silently', async () => {
        const tokenEntity = makeTokenEntity();
        passwordResetTokenRepo.findByHash.mockResolvedValue(tokenEntity);
        hashPassword.mockResolvedValue('hashed-pw');
        userRepo.updatePassword.mockResolvedValue(undefined);
        passwordResetTokenRepo.save.mockResolvedValue(undefined);
        sendNotificationUseCase.mockRejectedValue(new Error('SMTP down'));

        await expect(
            resetPasswordUseCase({ rawToken: RAW_TOKEN, password: 'NewPass1!' })
        ).resolves.not.toThrow();
    });

    it('throws PasswordResetTokenNotFoundError when no token matches the hash', async () => {
        passwordResetTokenRepo.findByHash.mockResolvedValue(null);
        await expect(resetPasswordUseCase({ rawToken: RAW_TOKEN, password: 'NewPass1!' }))
            .rejects.toThrow(PasswordResetTokenNotFoundError);
    });

    it('records a failure audit when the token is not found', async () => {
        passwordResetTokenRepo.findByHash.mockResolvedValue(null);
        await expect(resetPasswordUseCase({ rawToken: RAW_TOKEN, password: 'x' }, null)).rejects.toThrow();
        expect(recordFailure).toHaveBeenCalledWith(
            'AUTH_PASSWORD_RESET_DONE',
            null,
            expect.objectContaining({ reason: 'token not found' }),
            null,
        );
    });

    it('does NOT update the password when the token is not found', async () => {
        passwordResetTokenRepo.findByHash.mockResolvedValue(null);
        await expect(resetPasswordUseCase({ rawToken: RAW_TOKEN, password: 'x' })).rejects.toThrow();
        expect(userRepo.updatePassword).not.toHaveBeenCalled();
    });

    it('re-throws PasswordResetTokenExpiredError from assertValid', async () => {
        const expiredError = new PasswordResetTokenExpiredError();
        const tokenEntity  = makeTokenEntity({ assertValid: jest.fn().mockImplementation(() => { throw expiredError; }) });
        passwordResetTokenRepo.findByHash.mockResolvedValue(tokenEntity);

        await expect(resetPasswordUseCase({ rawToken: RAW_TOKEN, password: 'x' }))
            .rejects.toThrow(PasswordResetTokenExpiredError);
    });

    it('re-throws PasswordResetTokenAlreadyUsedError from assertValid', async () => {
        const usedError   = new PasswordResetTokenAlreadyUsedError();
        const tokenEntity = makeTokenEntity({ assertValid: jest.fn().mockImplementation(() => { throw usedError; }) });
        passwordResetTokenRepo.findByHash.mockResolvedValue(tokenEntity);

        await expect(resetPasswordUseCase({ rawToken: RAW_TOKEN, password: 'x' }))
            .rejects.toThrow(PasswordResetTokenAlreadyUsedError);
    });

    it('records a failure audit when assertValid throws', async () => {
        const expiredError = new PasswordResetTokenExpiredError('token expired');
        const tokenEntity  = makeTokenEntity({ assertValid: jest.fn().mockImplementation(() => { throw expiredError; }) });
        passwordResetTokenRepo.findByHash.mockResolvedValue(tokenEntity);

        await expect(resetPasswordUseCase({ rawToken: RAW_TOKEN, password: 'x' }, null)).rejects.toThrow();
        expect(recordFailure).toHaveBeenCalledWith(
            'AUTH_PASSWORD_RESET_DONE',
            'user-123',
            expect.objectContaining({ reason: 'token expired' }),
            null,
        );
    });

    it('does NOT update the password when assertValid throws', async () => {
        const tokenEntity = makeTokenEntity({
            assertValid: jest.fn().mockImplementation(() => { throw new PasswordResetTokenExpiredError(); }),
        });
        passwordResetTokenRepo.findByHash.mockResolvedValue(tokenEntity);

        await expect(resetPasswordUseCase({ rawToken: RAW_TOKEN, password: 'x' })).rejects.toThrow();
        expect(userRepo.updatePassword).not.toHaveBeenCalled();
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. validateResetTokenUseCase
// ═════════════════════════════════════════════════════════════════════════════
describe('validateResetTokenUseCase', () => {
    const RAW_TOKEN = 'b'.repeat(64);

    beforeEach(() => jest.clearAllMocks());

    it('returns { valid: true, userId } for a valid token', async () => {
        const tokenEntity = makeTokenEntity({ userId: 'user-999' });
        passwordResetTokenRepo.findByHash.mockResolvedValue(tokenEntity);

        const result = await validateResetTokenUseCase({ rawToken: RAW_TOKEN });
        expect(result).toEqual({ valid: true, userId: 'user-999' });
    });

    it('looks up the token by SHA-256 hash of the raw token', async () => {
        passwordResetTokenRepo.findByHash.mockResolvedValue(makeTokenEntity());
        await validateResetTokenUseCase({ rawToken: RAW_TOKEN });
        expect(passwordResetTokenRepo.findByHash).toHaveBeenCalledWith(sha256(RAW_TOKEN));
    });

    it('calls assertValid on the token entity', async () => {
        const tokenEntity = makeTokenEntity();
        passwordResetTokenRepo.findByHash.mockResolvedValue(tokenEntity);
        await validateResetTokenUseCase({ rawToken: RAW_TOKEN });
        expect(tokenEntity.assertValid).toHaveBeenCalledTimes(1);
    });

    it('throws PasswordResetTokenNotFoundError when no token matches', async () => {
        passwordResetTokenRepo.findByHash.mockResolvedValue(null);
        await expect(validateResetTokenUseCase({ rawToken: RAW_TOKEN }))
            .rejects.toThrow(PasswordResetTokenNotFoundError);
    });

    it('propagates PasswordResetTokenExpiredError from assertValid', async () => {
        const tokenEntity = makeTokenEntity({
            assertValid: jest.fn().mockImplementation(() => { throw new PasswordResetTokenExpiredError(); }),
        });
        passwordResetTokenRepo.findByHash.mockResolvedValue(tokenEntity);
        await expect(validateResetTokenUseCase({ rawToken: RAW_TOKEN }))
            .rejects.toThrow(PasswordResetTokenExpiredError);
    });

    it('propagates PasswordResetTokenAlreadyUsedError from assertValid', async () => {
        const tokenEntity = makeTokenEntity({
            assertValid: jest.fn().mockImplementation(() => { throw new PasswordResetTokenAlreadyUsedError(); }),
        });
        passwordResetTokenRepo.findByHash.mockResolvedValue(tokenEntity);
        await expect(validateResetTokenUseCase({ rawToken: RAW_TOKEN }))
            .rejects.toThrow(PasswordResetTokenAlreadyUsedError);
    });

    it('produces a different hash for two different raw tokens', async () => {
        passwordResetTokenRepo.findByHash
            .mockResolvedValueOnce(makeTokenEntity())
            .mockResolvedValueOnce(makeTokenEntity({ userId: 'user-other' }));

        await validateResetTokenUseCase({ rawToken: 'c'.repeat(64) });
        await validateResetTokenUseCase({ rawToken: 'd'.repeat(64) });

        const [hashA] = passwordResetTokenRepo.findByHash.mock.calls[0];
        const [hashB] = passwordResetTokenRepo.findByHash.mock.calls[1];
        expect(hashA).not.toBe(hashB);
    });
});