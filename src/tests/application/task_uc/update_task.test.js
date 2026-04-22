import { jest } from '@jest/globals';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo.js', () => ({
    findTaskByID:        jest.fn(),
    updateTask:          jest.fn(),
    ensureTaskOwnership: jest.fn(),
}));

// Source uses task_validator — must mock it
jest.unstable_mockModule('../../../app/validators/task_validator.js', () => ({
    validateStringLength: jest.fn((val, name, min, max) => {
        if (!val || val.length < min) throw new Error(`${name} must be at least ${min} characters`);
        if (val.length > max)         throw new Error(`${name} must be at most ${max} characters`);
        return val;
    }),
    validateEnum: jest.fn((val, enumObj, name) => {
        if (!Object.values(enumObj).includes(val))
            throw new Error(`Invalid ${name}: ${val}`);
        return val;
    }),
}));

jest.unstable_mockModule('../../../domain/base/task_enums.js', () => ({
    WritingStatus: { DRAFT: 'DRAFT', SUBMITTED: 'SUBMITTED' },
    TaskType:      { TASK1: 'TASK1', TASK2: 'TASK2' },
    ExamType:      { ACADEMIC: 'ACADEMIC', GENERAL: 'GENERAL' },
}));

// ── Import SUT after mocks ────────────────────────────────────────────────────

// Source exports updateWritingTask, not updateTask
const { updateWritingTask } = await import('../../../app/task_uc/update_task.uc.js');
const taskRepo              = await import('../../../infrastructure/repositories/task_repo.js');

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeTask = (overrides = {}) => ({
    id:     '507f1f77bcf86cd799439011',
    userId: '507f1f77bcf86cd799439012',
    _title: 'Original Title',
    ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('updateWritingTask use case', () => {
    const taskId  = '507f1f77bcf86cd799439011';
    const userId  = '507f1f77bcf86cd799439012';
    const fakeTask = makeTask({ userId });

    beforeEach(() => {
        jest.clearAllMocks();
        taskRepo.findTaskByID.mockResolvedValue(fakeTask);
        taskRepo.updateTask.mockImplementation(async (id, updates) => ({ ...fakeTask, ...updates }));
        taskRepo.ensureTaskOwnership.mockImplementation(() => {});
    });

    it('updates title and returns the updated task', async () => {
        const result = await updateWritingTask(taskId, { title: 'New Title' }, userId);

        expect(taskRepo.findTaskByID).toHaveBeenCalledWith(taskId);
        expect(taskRepo.updateTask).toHaveBeenCalledWith(taskId, { title: 'New Title' });
        expect(result.title).toBe('New Title');
    });

    it('updates description only', async () => {
        await updateWritingTask(taskId, { description: 'New description' }, userId);
        expect(taskRepo.updateTask).toHaveBeenCalledWith(taskId, { description: 'New description' });
    });

    it('updates questionPrompt only', async () => {
        await updateWritingTask(taskId, { questionPrompt: 'New prompt?' }, userId);
        expect(taskRepo.updateTask).toHaveBeenCalledWith(taskId, { questionPrompt: 'New prompt?' });
    });

    it('does not pass status in updates (status changes go through dedicated UCs)', async () => {
        // Source ignores updates.status entirely
        await updateWritingTask(taskId, { status: 'SUBMITTED' }, userId);
        const callArg = taskRepo.updateTask.mock.calls[0][1];
        expect(callArg).not.toHaveProperty('status');
    });

    it('throws ownership error if user does not own task', async () => {
        taskRepo.ensureTaskOwnership.mockImplementation(() => {
            throw new Error('User does not own task');
        });

        await expect(updateWritingTask(taskId, {}, userId)).rejects.toThrow('User does not own task');
        expect(taskRepo.updateTask).not.toHaveBeenCalled();
    });

    it('throws when title is too short', async () => {
        await expect(updateWritingTask(taskId, { title: 'ab' }, userId)).rejects.toThrow(/at least 3 characters/);
        expect(taskRepo.updateTask).not.toHaveBeenCalled();
    });

    it('throws when taskType is invalid', async () => {
        await expect(updateWritingTask(taskId, { taskType: 'INVALID' }, userId)).rejects.toThrow(/Invalid taskType/);
        expect(taskRepo.updateTask).not.toHaveBeenCalled();
    });

    it('throws when examType is invalid', async () => {
        await expect(updateWritingTask(taskId, { examType: 'INVALID' }, userId)).rejects.toThrow(/Invalid examType/);
        expect(taskRepo.updateTask).not.toHaveBeenCalled();
    });

    it('propagates repository errors', async () => {
        taskRepo.updateTask.mockRejectedValue(new Error('Update failed'));
        await expect(updateWritingTask(taskId, { title: 'Valid Title' }, userId)).rejects.toThrow('Update failed');
    });
});