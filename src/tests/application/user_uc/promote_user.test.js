import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../infrastructure/repositories/user_repo.js', () => ({
    findUserById: jest.fn(),
    promoteToAdmin: jest.fn(),
}));

const { promoteUserToAdminUseCase } = await import('../../../app/user_uc/promote_user.uc.js');
const userRepo = await import('../../../infrastructure/repositories/user_repo.js');
const { UserRole } = await import('../../../domain/base/user_enums.js');
const {
    UserValidationError,
    UserAlreadyAdminError,
    UserNotFoundError,
} = await import('../../../core/errors/user.errors.js');

describe('promoteUserToAdminUseCase', () => {
    const mockAdminUser = {
        id: 'user-1',
        _name: 'John Doe',
        _role: UserRole.ADMIN,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        userRepo.findUserById.mockResolvedValue({
            id: 'user-1',
            _name: 'John Doe',
            _role: UserRole.USER,
            promoteToAdmin: jest.fn(),
        });
        userRepo.promoteToAdmin.mockResolvedValue(mockAdminUser);
    });

    it('should promote user to admin successfully', async () => {
        const result = await promoteUserToAdminUseCase('user-1');
        expect(userRepo.promoteToAdmin).toHaveBeenCalledWith('user-1');
        expect(result._role).toBe(UserRole.ADMIN);
    });

    it('should call entity promoteToAdmin method before calling repo', async () => {
        const promoteToAdminMock = jest.fn();
        userRepo.findUserById.mockResolvedValue({
            id: 'user-1',
            _role: UserRole.USER,
            promoteToAdmin: promoteToAdminMock,
        });
        await promoteUserToAdminUseCase('user-1');
        expect(promoteToAdminMock).toHaveBeenCalledTimes(1);
        const entityCallOrder = promoteToAdminMock.mock.invocationCallOrder[0];
        const repoCallOrder = userRepo.promoteToAdmin.mock.invocationCallOrder[0];
        expect(entityCallOrder).toBeLessThan(repoCallOrder);
    });

    it('should throw UserAlreadyAdminError when user is already an admin', async () => {
        userRepo.findUserById.mockResolvedValue({
            id: 'user-1',
            _role: UserRole.ADMIN,
            promoteToAdmin: jest.fn(),
        });
        await expect(promoteUserToAdminUseCase('user-1')).rejects.toThrow(UserAlreadyAdminError);
        expect(userRepo.promoteToAdmin).not.toHaveBeenCalled();
    });

    it('should throw UserValidationError when id is empty', async () => {
        await expect(promoteUserToAdminUseCase('')).rejects.toThrow(UserValidationError);
        expect(userRepo.findUserById).not.toHaveBeenCalled();
    });

    it('should throw UserValidationError when id is null', async () => {
        await expect(promoteUserToAdminUseCase(null)).rejects.toThrow(UserValidationError);
    });

    it('should throw UserValidationError when id is undefined', async () => {
        await expect(promoteUserToAdminUseCase(undefined)).rejects.toThrow(UserValidationError);
    });

    it('should propagate UserNotFoundError when user does not exist', async () => {
        userRepo.findUserById.mockRejectedValue(new UserNotFoundError('user-1'));
        await expect(promoteUserToAdminUseCase('user-1')).rejects.toThrow(UserNotFoundError);
        expect(userRepo.promoteToAdmin).not.toHaveBeenCalled();
    });
});