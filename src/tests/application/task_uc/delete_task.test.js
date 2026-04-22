import { jest } from '@jest/globals';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo.js', () => ({
    findTaskByID:        jest.fn(),
    deleteTask:          jest.fn(),
    ensureTaskOwnership: jest.fn(),
}));

jest.unstable_mockModule('../../../core/services/audit.service.js', () => ({
    recordAudit:   jest.fn(),
    recordFailure: jest.fn(),
}));

jest.unstable_mockModule('../../../domain/base/audit_enums.js', () => ({
    AuditAction: { TASK_DELETED: 'TASK_DELETED' },
}));

// ── Import SUT after mocks ────────────────────────────────────────────────────

// Source exports deleteWritingTask, not deleteTask
const { deleteWritingTask } = await import('../../../app/task_uc/delete_task.uc.js');
const taskRepo              = await import('../../../infrastructure/repositories/task_repo.js');

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeTask = (overrides = {}) => ({
    id:          '507f1f77bcf86cd799439011',
    _id:         '507f1f77bcf86cd799439011',
    userId:      '507f1f77bcf86cd799439012',
    _title:      'Test Essay',
    _source:     'SELF',
    _assignedBy: null,
    ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('deleteWritingTask use case', () => {
    const taskId = '507f1f77bcf86cd799439011';
    const userId = '507f1f77bcf86cd799439012';

    beforeEach(() => {
        jest.clearAllMocks();
        taskRepo.findTaskByID.mockResolvedValue(makeTask({ userId }));
        taskRepo.deleteTask.mockResolvedValue(undefined);
        taskRepo.ensureTaskOwnership.mockImplementation(() => {});
    });

    it('deletes task and returns { deleted, taskId, title }', async () => {
        const result = await deleteWritingTask(taskId, userId);

        expect(taskRepo.findTaskByID).toHaveBeenCalledWith(taskId);
        expect(taskRepo.deleteTask).toHaveBeenCalledWith(taskId);
        // Source returns { deleted: true, taskId, title } — not a boolean
        expect(result).toMatchObject({ deleted: true, taskId, title: 'Test Essay' });
    });

    it('throws ownership error if user does not own task', async () => {
        taskRepo.ensureTaskOwnership.mockImplementation(() => {
            throw new Error('User does not own task');
        });

        await expect(deleteWritingTask(taskId, 'wrong-user')).rejects.toThrow('User does not own task');
        expect(taskRepo.deleteTask).not.toHaveBeenCalled();
    });

    it('propagates not-found error from findTaskByID', async () => {
        taskRepo.findTaskByID.mockRejectedValue(new Error('Task not found'));
        await expect(deleteWritingTask(taskId, userId)).rejects.toThrow('Task not found');
        expect(taskRepo.deleteTask).not.toHaveBeenCalled();
    });

    it('propagates error from deleteTask', async () => {
        taskRepo.deleteTask.mockRejectedValue(new Error('Delete failed'));
        await expect(deleteWritingTask(taskId, userId)).rejects.toThrow('Delete failed');
    });
});