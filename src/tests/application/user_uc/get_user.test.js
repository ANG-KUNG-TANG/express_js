import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../infrastructure/repositories/user_repo.js', () => ({
    findUserById: jest.fn(),
    findUserByEmail: jest.fn(),
}));

const { getUseByIdUc, getUserByEamilUc } = await import('../../../app/user_uc/get_user.uc.js');
const userRepo = await import('../../../infrastructure/repositories/user_repo.js');
const { UserRole } = await import('../../../domain/base/user_enums.js');
const {
    UserValidationError,
    UserInvalidEmailError,
    UserNotFoundError,
    UserEmailNotFoundError,
} = await import('../../../core/errors/user.errors.js');

describe('get_user use cases', () => {
    const mockUser = {
        id: 'user-1',
        _name: 'John Doe',
        email: 'john@example.com',
        _role: UserRole.USER,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getUseByIdUc', () => {
        it('should return user when valid id is provided', async () => {
            userRepo.findUserById.mockResolvedValue(mockUser);
            const result = await getUseByIdUc('user-1');
            expect(userRepo.findUserById).toHaveBeenCalledWith('user-1');
            expect(result).toBe(mockUser);
        });

        it('should throw UserValidationError when id is empty string', async () => {
            await expect(getUseByIdUc('')).rejects.toThrow(UserValidationError);
        });

        it('should throw UserValidationError when id is null', async () => {
            await expect(getUseByIdUc(null)).rejects.toThrow(UserValidationError);
        });

        it('should throw UserValidationError when id is undefined', async () => {
            await expect(getUseByIdUc(undefined)).rejects.toThrow(UserValidationError);
        });

        it('should propagate UserNotFoundError from repo', async () => {
            userRepo.findUserById.mockRejectedValue(new UserNotFoundError('user-1'));
            await expect(getUseByIdUc('user-1')).rejects.toThrow(UserNotFoundError);
        });
    });

    describe('getUserByEamilUc', () => {
        it('should return user when valid email is provided', async () => {
            userRepo.findUserByEmail.mockResolvedValue(mockUser);
            const result = await getUserByEamilUc('john@example.com');
            expect(userRepo.findUserByEmail).toHaveBeenCalledWith('john@example.com');
            expect(result).toBe(mockUser);
        });

        it('should lowercase email before calling repo', async () => {
            userRepo.findUserByEmail.mockResolvedValue(mockUser);
            await getUserByEamilUc('JOHN@EXAMPLE.COM');
            expect(userRepo.findUserByEmail).toHaveBeenCalledWith('john@example.com');
        });

        it('should throw UserValidationError when email is empty', async () => {
            await expect(getUserByEamilUc('')).rejects.toThrow(UserValidationError);
        });

        it('should throw UserInvalidEmailError when email format is invalid', async () => {
            await expect(getUserByEamilUc('not-an-email')).rejects.toThrow(UserInvalidEmailError);
        });

        it('should throw UserValidationError when email is null', async () => {
            await expect(getUserByEamilUc(null)).rejects.toThrow(UserValidationError);
        });

        it('should propagate UserEmailNotFoundError from repo', async () => {
            userRepo.findUserByEmail.mockRejectedValue(new UserEmailNotFoundError('john@example.com'));
            await expect(getUserByEamilUc('john@example.com')).rejects.toThrow(UserEmailNotFoundError);
        });
    });
});