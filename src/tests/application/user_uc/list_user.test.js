// src/tests/application/user_uc/list_user.test.js
import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../infrastructure/repositories/user_repo.js', () => ({
    lisAllUsers: jest.fn(),   // note: matches the typo in the actual repo export
}));

// ─── Import SUT after mocks ───────────────────────────────────────────────────

const { listAllUsersUseCase } = await import('../../../app/user_uc/list_user.uc.js');
const userRepo = await import('../../../infrastructure/repositories/user_repo.js');
const { UserRole } = await import('../../../domain/base/user_enums.js');

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('listAllUsersUseCase', () => {
    const mockUsers = [
        { id: 'user-1', _name: 'Alice', _email: 'alice@example.com', _role: UserRole.USER    },
        { id: 'user-2', _name: 'Bob',   _email: 'bob@example.com',   _role: UserRole.TEACHER },
        { id: 'user-3', _name: 'Carol', _email: 'carol@example.com', _role: UserRole.ADMIN   },
    ];

    beforeEach(() => jest.clearAllMocks());

    it('returns the full list of users from the repo', async () => {
        userRepo.lisAllUsers.mockResolvedValue(mockUsers);
        const result = await listAllUsersUseCase();
        expect(result).toBe(mockUsers);
        expect(result).toHaveLength(3);
    });

    it('calls lisAllUsers exactly once with no arguments', async () => {
        userRepo.lisAllUsers.mockResolvedValue(mockUsers);
        await listAllUsersUseCase();
        expect(userRepo.lisAllUsers).toHaveBeenCalledTimes(1);
        expect(userRepo.lisAllUsers).toHaveBeenCalledWith();
    });

    it('returns an empty array when no users exist', async () => {
        userRepo.lisAllUsers.mockResolvedValue([]);
        const result = await listAllUsersUseCase();
        expect(result).toEqual([]);
    });

    it('propagates repo errors without swallowing them', async () => {
        userRepo.lisAllUsers.mockRejectedValue(new Error('DB connection failed'));
        await expect(listAllUsersUseCase()).rejects.toThrow('DB connection failed');
    });

    it('does not filter or transform the result — returns raw repo output', async () => {
        userRepo.lisAllUsers.mockResolvedValue(mockUsers);
        const result = await listAllUsersUseCase();
        // UC has no transformation logic — result must be the exact reference
        expect(result).toBe(mockUsers);
    });
});