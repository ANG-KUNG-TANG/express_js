import { jest } from '@jest/globals';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo.js', () => ({
    transferTasks:      jest.fn(),
    transferSingleTask: jest.fn(),
}));

// ── Import SUT after mocks ────────────────────────────────────────────────────

// Source exports transferWritingTasks and transferSingleWritingTask, not transferTasks
const { transferWritingTasks, transferSingleWritingTask } =
    await import('../../../app/task_uc/transfer_task.uc.js');
const taskRepo = await import('../../../infrastructure/repositories/task_repo.js');

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('transferWritingTasks use case', () => {
    const fromUserId = '507f1f77bcf86cd799439012';
    const toUserId   = '507f1f77bcf86cd799439013';

    beforeEach(() => jest.clearAllMocks());

    it('transfers tasks and returns the repo result', async () => {
        taskRepo.transferTasks.mockResolvedValue({ transferred: 5 });

        const result = await transferWritingTasks(fromUserId, toUserId);

        expect(taskRepo.transferTasks).toHaveBeenCalledWith(fromUserId, toUserId, null);
        expect(result).toEqual({ transferred: 5 });
    });

    it('passes session through to the repo when provided', async () => {
        const session = { id: 'session-123' };
        taskRepo.transferTasks.mockResolvedValue({ transferred: 2 });

        await transferWritingTasks(fromUserId, toUserId, session);

        expect(taskRepo.transferTasks).toHaveBeenCalledWith(fromUserId, toUserId, session);
    });

    it('propagates repository errors', async () => {
        taskRepo.transferTasks.mockRejectedValue(new Error('Invalid user ID'));
        await expect(transferWritingTasks(fromUserId, toUserId)).rejects.toThrow('Invalid user ID');
    });
});

describe('transferSingleWritingTask use case', () => {
    const taskId     = '507f1f77bcf86cd799439011';
    const fromUserId = '507f1f77bcf86cd799439012';
    const toUserId   = '507f1f77bcf86cd799439013';

    beforeEach(() => jest.clearAllMocks());

    it('transfers a single task and returns the repo result', async () => {
        taskRepo.transferSingleTask.mockResolvedValue({ transferred: 1 });

        const result = await transferSingleWritingTask(taskId, fromUserId, toUserId);

        expect(taskRepo.transferSingleTask).toHaveBeenCalledWith(taskId, fromUserId, toUserId, null);
        expect(result).toEqual({ transferred: 1 });
    });

    it('passes session through to the repo when provided', async () => {
        const session = { id: 'session-123' };
        taskRepo.transferSingleTask.mockResolvedValue({ transferred: 1 });

        await transferSingleWritingTask(taskId, fromUserId, toUserId, session);

        expect(taskRepo.transferSingleTask).toHaveBeenCalledWith(taskId, fromUserId, toUserId, session);
    });
});