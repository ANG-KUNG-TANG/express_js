import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../infrastructure/repositories/user_repo.js', () => ({
    findUserById: jest.fn(),
    updateUser: jest.fn(),
}));

jest.unstable_mockModule('../../../app/validators/password_hash.js', () => ({
    hashPassword: jest.fn(),
}));

const { updateUserUseCase } = await import('../../../app/user_uc/update_use.uc.js');
const userRepo = await import('../../../infrastructure/repositories/user_repo.js');
const hashUtil = await import('../../../app/validators/password_hash.js');
const { UserRole } = await import('../../../domain/base/user_enums.js');
const {
    UserValidationError,
    UserNameTooShortError,
    UserNameTooLongError,
    UserInvalidEmailError,
    UserPasswordTooWeakError,
    UserInvalidRoleError,
} = await import('../../../core/errors/user.errors.js');

describe('updateUserUseCase', () => {
    const mockUser = {
        id: 'user-1',
        _name: 'John Doe',
        _email: 'john@example.com',
        _password: 'hashed:oldpassword',
        _role: UserRole.USER,
        _updatedAt: new Date(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        hashUtil.hashPassword.mockReturnValue('hashed:newpassword');
        userRepo.findUserById.mockResolvedValue({ ...mockUser });
        userRepo.updateUser.mockResolvedValue({ ...mockUser, _name: 'Jane Doe' });
    });

    it('should update name successfully', async () => {
        await updateUserUseCase('user-1', { name: 'Jane Doe' });
        expect(userRepo.updateUser).toHaveBeenCalledTimes(1);
        const updatedUser = userRepo.updateUser.mock.calls[0][1];
        expect(updatedUser._name).toBe('Jane Doe');
    });

    it('should trim name before applying update', async () => {
        await updateUserUseCase('user-1', { name: '  Jane Doe  ' });
        const updatedUser = userRepo.updateUser.mock.calls[0][1];
        expect(updatedUser._name).toBe('Jane Doe');
    });

    it('should lowercase email before applying update', async () => {
        await updateUserUseCase('user-1', { email: 'JANE@EXAMPLE.COM' });
        const updatedUser = userRepo.updateUser.mock.calls[0][1];
        expect(updatedUser._email).toBe('jane@example.com');
    });

    it('should hash password when updating password', async () => {
        await updateUserUseCase('user-1', { password: 'newpassword123' });
        expect(hashUtil.hashPassword).toHaveBeenCalledWith('newpassword123');
        const updatedUser = userRepo.updateUser.mock.calls[0][1];
        expect(updatedUser._password).toBe('hashed:newpassword');
    });

    it('should update role successfully', async () => {
        await updateUserUseCase('user-1', { role: UserRole.ADMIN });
        const updatedUser = userRepo.updateUser.mock.calls[0][1];
        expect(updatedUser._role).toBe(UserRole.ADMIN);
    });

    it('should strip unknown fields and only apply allowed fields', async () => {
        await updateUserUseCase('user-1', { name: 'Jane', isHacker: true });
        const updatedUser = userRepo.updateUser.mock.calls[0][1];
        expect(updatedUser).not.toHaveProperty('isHacker');
    });

    it('should set updatedAt to current date on update', async () => {
        const before = new Date();
        await updateUserUseCase('user-1', { name: 'Jane Doe' });
        const updatedUser = userRepo.updateUser.mock.calls[0][1];
        expect(updatedUser._updatedAt).toBeInstanceOf(Date);
        expect(updatedUser._updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should throw UserValidationError when id is empty', async () => {
        await expect(updateUserUseCase('', { name: 'Jane' })).rejects.toThrow(UserValidationError);
    });

    it('should throw UserValidationError when id is null', async () => {
        await expect(updateUserUseCase(null, { name: 'Jane' })).rejects.toThrow(UserValidationError);
    });

    it('should throw UserValidationError when updates object is empty', async () => {
        await expect(updateUserUseCase('user-1', {})).rejects.toThrow(UserValidationError);
    });

    it('should throw UserValidationError when updates only has unknown fields', async () => {
        await expect(updateUserUseCase('user-1', { isHacker: true })).rejects.toThrow(UserValidationError);
    });

    it('should throw UserNameTooShortError when name is too short', async () => {
        await expect(updateUserUseCase('user-1', { name: 'ab' })).rejects.toThrow(UserNameTooShortError);
    });

    it('should throw UserNameTooLongError when name exceeds max length', async () => {
        await expect(updateUserUseCase('user-1', { name: 'a'.repeat(101) })).rejects.toThrow(UserNameTooLongError);
    });

    it('should throw UserInvalidEmailError when email format is invalid', async () => {
        await expect(updateUserUseCase('user-1', { email: 'bad-email' })).rejects.toThrow(UserInvalidEmailError);
    });

    it('should throw UserPasswordTooWeakError when new password is too short', async () => {
        await expect(updateUserUseCase('user-1', { password: '123' })).rejects.toThrow(UserPasswordTooWeakError);
    });

    it('should throw UserInvalidRoleError when role is invalid', async () => {
        await expect(updateUserUseCase('user-1', { role: 'SUPERUSER' })).rejects.toThrow(UserInvalidRoleError);
    });
});