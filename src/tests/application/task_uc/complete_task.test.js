import { jest } from '@jest/globals';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo.js', () => ({
    findTaskByID:       jest.fn(),
    submitTask:         jest.fn(),           // source calls submitTask, not completeTask
    ensureTaskOwnership: jest.fn(),
}));

jest.unstable_mockModule('../../../core/errors/task.errors.js', () => ({
    TaskValidationError: class TaskValidationError extends Error {
        constructor(...args) { super(args[0]); this.name = 'TaskValidationError'; }
    },
}));

jest.unstable_mockModule('../../../core/services/notification.service.js', () => ({
    NotificationService: { send: jest.fn(), TYPES: { TASK_SUBMITTED: 'TASK_SUBMITTED' } },
}));

jest.unstable_mockModule('../../../core/services/audit.service.js', () => ({
    recordAudit:   jest.fn(),
    recordFailure: jest.fn(),
}));

jest.unstable_mockModule('../../../domain/base/audit_enums.js', () => ({
    AuditAction: { TASK_SUBMITTED: 'TASK_SUBMITTED' },
}));

jest.unstable_mockModule('../../../domain/base/task_enums.js', () => ({
    TaskSource:       { SELF: 'SELF', ASSIGNED: 'ASSIGNED' },
    AssignmentStatus: { ACCEPTED: 'ACCEPTED', PENDING_ACCEPTANCE: 'PENDING_ACCEPTANCE' },
}));

// ── Import SUT after mocks ────────────────────────────────────────────────────

const { submitTask } = await import('../../../app/task_uc/complete_task.uc.js');
const taskRepo       = await import('../../../infrastructure/repositories/task_repo.js');

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeTask = (overrides = {}) => ({
    id:                '507f1f77bcf86cd799439011',
    _id:               '507f1f77bcf86cd799439011',
    userId:            '507f1f77bcf86cd799439012',
    _title:            'Test Essay',
    _status:           'SUBMITTED',
    _source:           'SELF',
    _assignedBy:       null,
    _assignmentStatus: null,
    startWriting:      jest.fn(),
    ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('submitTask use case', () => {
    const taskId         = '507f1f77bcf86cd799439011';
    const userId         = '507f1f77bcf86cd799439012';
    const submissionText = 'My essay submission text';

    beforeEach(() => {
        jest.clearAllMocks();
        taskRepo.findTaskByID.mockResolvedValue(makeTask({ userId }));
        taskRepo.submitTask.mockResolvedValue({ _status: 'SUBMITTED', _title: 'Test Essay' });
        taskRepo.ensureTaskOwnership.mockImplementation(() => {});
    });

    it('submits task successfully and returns the submitted task', async () => {
        const result = await submitTask(taskId, userId, submissionText);

        expect(taskRepo.findTaskByID).toHaveBeenCalledWith(taskId);
        expect(taskRepo.submitTask).toHaveBeenCalledWith(taskId, submissionText);
        expect(result._status).toBe('SUBMITTED');
    });

    it('throws TaskValidationError when submissionText is missing', async () => {
        await expect(submitTask(taskId, userId, '')).rejects.toMatchObject({ name: 'TaskValidationError' });
        expect(taskRepo.submitTask).not.toHaveBeenCalled();
    });

    it('throws TaskValidationError when submissionText is whitespace only', async () => {
        await expect(submitTask(taskId, userId, '   ')).rejects.toMatchObject({ name: 'TaskValidationError' });
    });

    it('throws TaskValidationError when task is assigned but not yet accepted', async () => {
        taskRepo.findTaskByID.mockResolvedValue(makeTask({
            userId,
            _source:           'ASSIGNED',
            _assignedBy:       'teacher-1',
            _assignmentStatus: 'PENDING_ACCEPTANCE',
        }));

        await expect(submitTask(taskId, userId, submissionText)).rejects.toMatchObject({ name: 'TaskValidationError' });
        expect(taskRepo.submitTask).not.toHaveBeenCalled();
    });

    it('throws ownership error if user does not own task', async () => {
        taskRepo.ensureTaskOwnership.mockImplementation(() => {
            throw new Error('User does not own task');
        });

        await expect(submitTask(taskId, 'wrong-user', submissionText)).rejects.toThrow('User does not own task');
        expect(taskRepo.submitTask).not.toHaveBeenCalled();
    });

    it('propagates repository errors from submitTask', async () => {
        taskRepo.submitTask.mockRejectedValue(new Error('DB write failed'));
        await expect(submitTask(taskId, userId, submissionText)).rejects.toThrow('DB write failed');
    });
});