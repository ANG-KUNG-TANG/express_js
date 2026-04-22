import { jest } from '@jest/globals';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo.js', () => ({
    findTaskByID:        jest.fn(),
    updateTask:          jest.fn(),   // source calls updateTask after task.startWriting()
    ensureTaskOwnership: jest.fn(),
    // NOTE: source does NOT call a repo startTask() — it calls task.startWriting() on the entity
}));

// ── Import SUT after mocks ────────────────────────────────────────────────────

// Source exports startWritingTask, not startTask
const { startWritingTask } = await import('../../../app/task_uc/start_task.uc.js');
const taskRepo             = await import('../../../infrastructure/repositories/task_repo.js');

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeTask = (overrides = {}) => ({
    id:           '507f1f77bcf86cd799439011',
    _id:          '507f1f77bcf86cd799439011',
    userId:       '507f1f77bcf86cd799439012',
    _status:      'ASSIGNED',
    _startedAt:   null,
    // startWriting is an entity method — mock it directly on the task object
    startWriting: jest.fn(),
    ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('startWritingTask use case', () => {
    const taskId = '507f1f77bcf86cd799439011';
    const userId = '507f1f77bcf86cd799439012';
    let fakeTask;

    beforeEach(() => {
        jest.clearAllMocks();
        fakeTask = makeTask({ userId });
        taskRepo.findTaskByID.mockResolvedValue(fakeTask);
        taskRepo.updateTask.mockResolvedValue({ ...fakeTask, _status: 'IN_PROGRESS' });
        taskRepo.ensureTaskOwnership.mockImplementation(() => {});
    });

    it('starts task successfully: calls startWriting() on entity then persists via updateTask', async () => {
        const result = await startWritingTask(taskId, userId);

        expect(taskRepo.findTaskByID).toHaveBeenCalledWith(taskId);
        expect(fakeTask.startWriting).toHaveBeenCalled();
        expect(taskRepo.updateTask).toHaveBeenCalledWith(
            taskId,
            expect.objectContaining({ status: fakeTask._status, startedAt: fakeTask._startedAt })
        );
        expect(result._status).toBe('IN_PROGRESS');
    });

    it('throws ownership error if user does not own task', async () => {
        taskRepo.ensureTaskOwnership.mockImplementation(() => {
            throw new Error('User does not own task');
        });

        await expect(startWritingTask(taskId, 'wrong-user')).rejects.toThrow('User does not own task');
        expect(fakeTask.startWriting).not.toHaveBeenCalled();
        expect(taskRepo.updateTask).not.toHaveBeenCalled();
    });

    it('propagates errors thrown by task.startWriting() (e.g. wrong status)', async () => {
        fakeTask.startWriting.mockImplementation(() => {
            throw new Error('Task cannot be started from current status');
        });

        await expect(startWritingTask(taskId, userId)).rejects.toThrow('Task cannot be started from current status');
        expect(taskRepo.updateTask).not.toHaveBeenCalled();
    });

    it('propagates repository errors from updateTask', async () => {
        taskRepo.updateTask.mockRejectedValue(new Error('DB write failed'));
        await expect(startWritingTask(taskId, userId)).rejects.toThrow('DB write failed');
    });
});