import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../infrastructure/repositories/user_repo.js', () => ({
    findUserByEmail: jest.fn(),
    sanitizeUser: jest.fn(),
}));

jest.unstable_mockModule('../../../app/validators/password_hash.js', () => ({
    verifyPassword: jest.fn(),
}));

const { authenticateUserUseCase } = await import('../../../app/user_uc/auth_User.uc.js');
const userRepo = await import('../../../infrastructure/repositories/user_repo.js');
const hashUtil = await import('../../../app/validators/password_hash.js');
const { UserRole } = await import('../../../domain/base/user_enums.js');
const {
    InvalidCredentialsError,
    UserInvalidEmailError,
    UserValidationError,
} = await import('../../../core/errors/user.errors.js');

describe('authenticateUserUseCase', () => {
    const mockUser = {
        id: 'user-1',
        _name: 'John Doe',
        _email: 'john@example.com',
        _password: 'hashed:password',
        _role: UserRole.USER,
    };

    const mockSanitized = {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.USER,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        userRepo.findUserByEmail.mockResolvedValue(mockUser);
        userRepo.sanitizeUser.mockReturnValue(mockSanitized);
        hashUtil.verifyPassword.mockReturnValue(true);
    });

    it('should return sanitized user on successful authentication', async () => {
        const result = await authenticateUserUseCase({ email: 'john@example.com', password: 'secure123' });
        expect(result).toBe(mockSanitized);
        expect(result).not.toHaveProperty('password');
    });

    it('should lowercase email before querying repo', async () => {
        await authenticateUserUseCase({ email: 'JOHN@EXAMPLE.COM', password: 'secure123' });
        expect(userRepo.findUserByEmail).toHaveBeenCalledWith('john@example.com');
    });

    it('should call verifyPassword with plain text and stored hash', async () => {
        await authenticateUserUseCase({ email: 'john@example.com', password: 'secure123' });
        expect(hashUtil.verifyPassword).toHaveBeenCalledWith('secure123', mockUser._password);
    });

    it('should throw InvalidCredentialsError when password does not match', async () => {
        hashUtil.verifyPassword.mockReturnValue(false);
        await expect(
            authenticateUserUseCase({ email: 'john@example.com', password: 'wrongpassword' })
        ).rejects.toThrow(InvalidCredentialsError);
    });

    it('should not expose which field was wrong in the error message', async () => {
        hashUtil.verifyPassword.mockReturnValue(false);
        try {
            await authenticateUserUseCase({ email: 'john@example.com', password: 'wrong' });
        } catch (err) {
            expect(err.message).not.toMatch(/email/i);
            expect(err.message).not.toMatch(/password/i);
            expect(err).toBeInstanceOf(InvalidCredentialsError);
        }
    });

    it('should throw UserValidationError when email is empty', async () => {
        await expect(authenticateUserUseCase({ email: '', password: 'secure123' }))
            .rejects.toThrow(UserValidationError);
    });

    it('should throw UserInvalidEmailError when email format is invalid', async () => {
        await expect(authenticateUserUseCase({ email: 'not-an-email', password: 'secure123' }))
            .rejects.toThrow(UserInvalidEmailError);
    });

    it('should throw UserValidationError when password is empty', async () => {
        await expect(authenticateUserUseCase({ email: 'john@example.com', password: '' }))
            .rejects.toThrow(UserValidationError);
    });

    it('should throw UserValidationError when password is null', async () => {
        await expect(authenticateUserUseCase({ email: 'john@example.com', password: null }))
            .rejects.toThrow(UserValidationError);
    });

    it('should not call verifyPassword if input validation fails', async () => {
        await expect(authenticateUserUseCase({ email: 'bad', password: '' })).rejects.toThrow();
        expect(hashUtil.verifyPassword).not.toHaveBeenCalled();
    });
});