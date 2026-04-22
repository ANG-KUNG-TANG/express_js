import { jest } from '@jest/globals';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo.js', () => ({
    findTaskByID:        jest.fn(),
    ensureTaskOwnership: jest.fn(),
}));

// ── Import SUT after mocks ────────────────────────────────────────────────────

// Source exports getWritingTaskById, not getTaskById
const { getWritingTaskById } = await import('../../../app/task_uc/get_task.uc.js');
const taskRepo               = await import('../../../infrastructure/repositories/task_repo.js');

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeTask = (overrides = {}) => ({
    id:     '507f1f77bcf86cd799439011',
    userId: '507f1f77bcf86cd799439012',
    _title: 'Test Essay',
    ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getWritingTaskById use case', () => {
    const taskId = '507f1f77bcf86cd799439011';
    const userId = '507f1f77bcf86cd799439012';
    const fakeTask = makeTask({ userId });

    beforeEach(() => {
        jest.clearAllMocks();
        taskRepo.findTaskByID.mockResolvedValue(fakeTask);
        taskRepo.ensureTaskOwnership.mockImplementation(() => {});
    });

    it('returns task without ownership check when no userId provided', async () => {
        const result = await getWritingTaskById(taskId);

        expect(taskRepo.findTaskByID).toHaveBeenCalledWith(taskId);
        expect(taskRepo.ensureTaskOwnership).not.toHaveBeenCalled();
        expect(result).toEqual(fakeTask);
    });

    it('calls ensureTaskOwnership when userId is provided', async () => {
        const result = await getWritingTaskById(taskId, userId);

        expect(taskRepo.ensureTaskOwnership).toHaveBeenCalledWith(fakeTask, userId);
        expect(result).toEqual(fakeTask);
    });

    it('throws ownership error if userId does not match', async () => {
        taskRepo.ensureTaskOwnership.mockImplementation(() => {
            throw new Error('User does not own task');
        });

        await expect(getWritingTaskById(taskId, 'wrong-user')).rejects.toThrow('User does not own task');
    });

    it('propagates not-found error from repo', async () => {
        taskRepo.findTaskByID.mockRejectedValue(new Error('Task not found'));
        await expect(getWritingTaskById(taskId, userId)).rejects.toThrow('Task not found');
    });
});