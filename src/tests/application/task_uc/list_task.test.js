import { jest } from '@jest/globals';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo.js', () => ({
    findTasks: jest.fn(),
}));

// ── Import SUT after mocks ────────────────────────────────────────────────────

// Source exports listWritingTasks, not listTasks
const { listWritingTasks } = await import('../../../app/task_uc/list_task.uc.js');
const taskRepo             = await import('../../../infrastructure/repositories/task_repo.js');

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('listWritingTasks use case', () => {
    const userId = '507f1f77bcf86cd799439012';

    beforeEach(() => jest.clearAllMocks());

    it('merges filters into options and calls findTasks with empty first arg', async () => {
        // Source: finalOptions = { ...options, ...filters } → findTasks({}, finalOptions)
        // filters are spread INTO options, so status ends up in the options object
        taskRepo.findTasks.mockResolvedValue([]);

        await listWritingTasks({ status: 'PENDING' }, { limit: 10 });

        expect(taskRepo.findTasks).toHaveBeenCalledWith(
            {},
            { limit: 10, status: 'PENDING' }
        );
    });

    it('injects userId into finalOptions when provided', async () => {
        taskRepo.findTasks.mockResolvedValue([]);

        await listWritingTasks({ status: 'PENDING' }, { limit: 10 }, userId);

        expect(taskRepo.findTasks).toHaveBeenCalledWith(
            {},
            { limit: 10, status: 'PENDING', userId }
        );
    });

    it('calls findTasks with empty objects when no args given', async () => {
        taskRepo.findTasks.mockResolvedValue([]);

        await listWritingTasks();

        expect(taskRepo.findTasks).toHaveBeenCalledWith({}, {});
    });

    it('does not add userId to options when userId is null', async () => {
        taskRepo.findTasks.mockResolvedValue([]);

        await listWritingTasks({}, {}, null);

        const callArg = taskRepo.findTasks.mock.calls[0][1];
        expect(callArg).not.toHaveProperty('userId');
    });

    it('returns the tasks from the repo', async () => {
        const fakeTasks = [{ id: '1' }, { id: '2' }];
        taskRepo.findTasks.mockResolvedValue(fakeTasks);

        const result = await listWritingTasks();
        expect(result).toEqual(fakeTasks);
    });
});