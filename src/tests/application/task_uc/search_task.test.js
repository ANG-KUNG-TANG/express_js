import { jest } from '@jest/globals';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo.js', () => ({
    searchTasksByTitle: jest.fn(),
}));

jest.unstable_mockModule('../../../core/errors/task.errors.js', () => ({
    TaskValidationError: class TaskValidationError extends Error {
        constructor(...args) { super(args[0]); this.name = 'TaskValidationError'; }
    },
}));

// ── Import SUT after mocks ────────────────────────────────────────────────────

// Source exports searchWritingTasks — the original file imported get_task.uc by mistake
const { searchWritingTasks } = await import('../../../app/task_uc/search_task.uc.js');
const taskRepo               = await import('../../../infrastructure/repositories/task_repo.js');

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeTask = (userId, overrides = {}) => ({
    id:      'task-1',
    _title:  'Test Essay',
    _userId: { toString: () => userId },
    ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('searchWritingTasks use case', () => {
    const userId = '507f1f77bcf86cd799439012';

    beforeEach(() => jest.clearAllMocks());

    it('returns all matching tasks when no userId filter is given', async () => {
        const tasks = [makeTask(userId), makeTask('other-user')];
        taskRepo.searchTasksByTitle.mockResolvedValue(tasks);

        const result = await searchWritingTasks('Essay');

        expect(taskRepo.searchTasksByTitle).toHaveBeenCalledWith('Essay', {});
        expect(result).toHaveLength(2);
    });

    it('filters results by userId when provided', async () => {
        const tasks = [makeTask(userId), makeTask('other-user')];
        taskRepo.searchTasksByTitle.mockResolvedValue(tasks);

        const result = await searchWritingTasks('Essay', {}, userId);

        expect(result).toHaveLength(1);
        expect(result[0]._userId.toString()).toBe(userId);
    });

    it('passes options to the repo', async () => {
        taskRepo.searchTasksByTitle.mockResolvedValue([]);

        await searchWritingTasks('Essay', { limit: 5 });

        expect(taskRepo.searchTasksByTitle).toHaveBeenCalledWith('Essay', { limit: 5 });
    });

    it('throws TaskValidationError when searchTerm is empty string', async () => {
        await expect(searchWritingTasks('')).rejects.toMatchObject({ name: 'TaskValidationError' });
        expect(taskRepo.searchTasksByTitle).not.toHaveBeenCalled();
    });

    it('throws TaskValidationError when searchTerm is not a string', async () => {
        await expect(searchWritingTasks(null)).rejects.toMatchObject({ name: 'TaskValidationError' });
        expect(taskRepo.searchTasksByTitle).not.toHaveBeenCalled();
    });

    it('returns empty array when no tasks match', async () => {
        taskRepo.searchTasksByTitle.mockResolvedValue([]);
        const result = await searchWritingTasks('nonexistent');
        expect(result).toEqual([]);
    });

    it('propagates repository errors', async () => {
        taskRepo.searchTasksByTitle.mockRejectedValue(new Error('DB error'));
        await expect(searchWritingTasks('Essay')).rejects.toThrow('DB error');
    });
});