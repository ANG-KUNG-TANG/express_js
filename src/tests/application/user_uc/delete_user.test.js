import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../infrastructure/repositories/user_repo.js', () => ({
    findUserById: jest.fn(),
    deleteUser: jest.fn(),
}));

const { deleteUserUc } = await import('../../../app/user_uc/delete_user.uc.js');
const userRepo = await import('../../../infrastructure/repositories/user_repo.js');
const { UserValidationError, UserNotFoundError } = await import('../../../core/errors/user.errors.js');

describe('deleteUserUc', () => {
    const mockUser = { id: 'user-1', _name: 'John Doe' };

    beforeEach(() => {
        jest.clearAllMocks();
        userRepo.findUserById.mockResolvedValue(mockUser);
        userRepo.deleteUser.mockResolvedValue(undefined);
    });

    it('should delete user and return { deleted: true, id } on success', async () => {
        const result = await deleteUserUc('user-1');
        expect(result).toEqual({ deleted: true, id: 'user-1' });
    });

    it('should call findUserById before deleteUser to confirm existence', async () => {
        await deleteUserUc('user-1');
        const findOrder = userRepo.findUserById.mock.invocationCallOrder[0];
        const deleteOrder = userRepo.deleteUser.mock.invocationCallOrder[0];
        expect(findOrder).toBeLessThan(deleteOrder);
    });

    it('should call deleteUser with the correct id', async () => {
        await deleteUserUc('user-1');
        expect(userRepo.deleteUser).toHaveBeenCalledWith('user-1');
    });

    it('should throw UserValidationError when id is empty string', async () => {
        await expect(deleteUserUc('')).rejects.toThrow(UserValidationError);
        expect(userRepo.findUserById).not.toHaveBeenCalled();
        expect(userRepo.deleteUser).not.toHaveBeenCalled();
    });

    it('should throw UserValidationError when id is null', async () => {
        await expect(deleteUserUc(null)).rejects.toThrow(UserValidationError);
    });

    it('should throw UserValidationError when id is undefined', async () => {
        await expect(deleteUserUc(undefined)).rejects.toThrow(UserValidationError);
    });

    it('should throw UserNotFoundError when user does not exist', async () => {
        userRepo.findUserById.mockRejectedValue(new UserNotFoundError('user-1'));
        await expect(deleteUserUc('user-1')).rejects.toThrow(UserNotFoundError);
        expect(userRepo.deleteUser).not.toHaveBeenCalled();
    });
});