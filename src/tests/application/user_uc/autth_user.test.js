// src/tests/application/user_uc/autth_user.test.js
import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../infrastructure/repositories/user_repo.js', () => ({
    findUserByEmailWithPassword: jest.fn(),
    // sanitizeUser is NOT here – it comes from user.mapper.js
}));

jest.unstable_mockModule('../../../infrastructure/mapper/user.mapper.js', () => ({
    sanitizeUser: jest.fn(),
}));

jest.unstable_mockModule('../../../app/validators/password_hash.js', () => ({
    verifyPassword: jest.fn(),
}));

jest.unstable_mockModule('../../../core/services/audit.service.js', () => ({
    recordAudit:   jest.fn(),
    recordFailure: jest.fn(),
}));

// ─── Import SUT after mocks ───────────────────────────────────────────────────
const { authenticateUserUseCase } = await import('../../../app/user_uc/auth_user.uc.js');
const userRepo    = await import('../../../infrastructure/repositories/user_repo.js');
const hashUtil    = await import('../../../app/validators/password_hash.js');
const auditSvc    = await import('../../../core/services/audit.service.js');
const userMapper  = await import('../../../infrastructure/mapper/user.mapper.js');
const { UserRole } = await import('../../../domain/base/user_enums.js');
const {
    InvalidCredentialsError,
    UserInvalidEmailError,
    UserValidationError,
} = await import('../../../core/errors/user.errors.js');

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('authenticateUserUseCase', () => {
    const mockUser = {
        id:        'user-1',
        _name:     'John Doe',
        _email:    'john@example.com',
        _password: 'hashed:password',
        _role:     UserRole.USER,
    };

    const mockSanitized = {
        id:    'user-1',
        name:  'John Doe',
        email: 'john@example.com',
        role:  UserRole.USER,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        userRepo.findUserByEmailWithPassword.mockResolvedValue(mockUser);
        userMapper.sanitizeUser.mockReturnValue(mockSanitized);
        hashUtil.verifyPassword.mockReturnValue(true);
    });

    // ── Happy path ─────────────────────────────────────────────────────────────

    it('returns sanitized user on successful login', async () => {
        const result = await authenticateUserUseCase({ email: 'john@example.com', password: 'secure123' });
        expect(result).toBe(mockSanitized);
        expect(result).not.toHaveProperty('password');
    });

    it('lowercases email before querying the repo', async () => {
        await authenticateUserUseCase({ email: 'JOHN@EXAMPLE.COM', password: 'secure123' });
        expect(userRepo.findUserByEmailWithPassword).toHaveBeenCalledWith('john@example.com');
    });

    it('calls verifyPassword with the plain-text password and stored hash', async () => {
        await authenticateUserUseCase({ email: 'john@example.com', password: 'secure123' });
        expect(hashUtil.verifyPassword).toHaveBeenCalledWith('secure123', mockUser._password);
    });

    // ── Audit logging ──────────────────────────────────────────────────────────

    it('calls recordAudit on successful login', async () => {
        await authenticateUserUseCase({ email: 'john@example.com', password: 'secure123' });
        expect(auditSvc.recordAudit).toHaveBeenCalledTimes(1);
        expect(auditSvc.recordFailure).not.toHaveBeenCalled();
    });

    it('calls recordFailure (not recordAudit) on wrong password', async () => {
        hashUtil.verifyPassword.mockReturnValue(false);
        await expect(
            authenticateUserUseCase({ email: 'john@example.com', password: 'wrong' })
        ).rejects.toThrow(InvalidCredentialsError);
        expect(auditSvc.recordFailure).toHaveBeenCalledTimes(1);
        expect(auditSvc.recordAudit).not.toHaveBeenCalled();
    });

    it('passes req to audit functions when provided', async () => {
        const req = { ip: '127.0.0.1', headers: { 'user-agent': 'Jest' } };
        await authenticateUserUseCase({ email: 'john@example.com', password: 'secure123' }, req);
        expect(auditSvc.recordAudit).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.anything(),
            req,
        );
    });

    // ── Credential errors ──────────────────────────────────────────────────────

    it('throws InvalidCredentialsError when password does not match', async () => {
        hashUtil.verifyPassword.mockReturnValue(false);
        await expect(
            authenticateUserUseCase({ email: 'john@example.com', password: 'wrongpassword' })
        ).rejects.toThrow(InvalidCredentialsError);
    });

    it('throws InvalidCredentialsError when user is not found (no email leak)', async () => {
        userRepo.findUserByEmailWithPassword.mockResolvedValue(null);
        const err = await authenticateUserUseCase({ email: 'nobody@example.com', password: 'pass' })
            .catch(e => e);
        expect(err).toBeInstanceOf(InvalidCredentialsError);
        // Error message must not reveal which field failed
        expect(err.message).not.toMatch(/email/i);
        expect(err.message).not.toMatch(/password/i);
    });

    it('does not call verifyPassword when user is not found', async () => {
        userRepo.findUserByEmailWithPassword.mockResolvedValue(null);
        await expect(
            authenticateUserUseCase({ email: 'nobody@example.com', password: 'pass' })
        ).rejects.toThrow(InvalidCredentialsError);
        expect(hashUtil.verifyPassword).not.toHaveBeenCalled();
    });

    // ── Input validation ───────────────────────────────────────────────────────

    it('throws UserValidationError when email is empty', async () => {
        await expect(
            authenticateUserUseCase({ email: '', password: 'secure123' })
        ).rejects.toThrow(UserValidationError);
    });

    it('throws UserInvalidEmailError when email format is invalid', async () => {
        await expect(
            authenticateUserUseCase({ email: 'not-an-email', password: 'secure123' })
        ).rejects.toThrow(UserInvalidEmailError);
    });

    it('throws UserValidationError when password is empty', async () => {
        await expect(
            authenticateUserUseCase({ email: 'john@example.com', password: '' })
        ).rejects.toThrow(UserValidationError);
    });

    it('throws UserValidationError when password is null', async () => {
        await expect(
            authenticateUserUseCase({ email: 'john@example.com', password: null })
        ).rejects.toThrow(UserValidationError);
    });

    it('does not call verifyPassword when input validation fails', async () => {
        await expect(
            authenticateUserUseCase({ email: 'bad', password: '' })
        ).rejects.toThrow();
        expect(hashUtil.verifyPassword).not.toHaveBeenCalled();
    });

    it('does not call recordAudit or recordFailure when input validation fails', async () => {
        await expect(
            authenticateUserUseCase({ email: '', password: '' })
        ).rejects.toThrow();
        expect(auditSvc.recordAudit).not.toHaveBeenCalled();
        expect(auditSvc.recordFailure).not.toHaveBeenCalled();
    });
});