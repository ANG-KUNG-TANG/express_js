// src/tests/application/teacher_uc/teacher_get_review.uc.test.js
import { jest } from '@jest/globals';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo.js', () => ({
    findTaskByID: jest.fn(),
    reviewTask:   jest.fn(),
    scoreTask:    jest.fn(),
}));

jest.unstable_mockModule('../../../core/errors/task.errors.js', () => ({
    TaskOwnershipError: class TaskOwnershipError extends Error {
        constructor(id, msg) { super(msg); this.name = 'TaskOwnershipError'; this.taskId = id; }
    },
}));

jest.unstable_mockModule('../../../core/errors/base.errors.js', () => ({
    NotFoundError:  class NotFoundError  extends Error { constructor(m) { super(m); this.name = 'NotFoundError';  } },
    ForbiddenError: class ForbiddenError extends Error { constructor(m) { super(m); this.name = 'ForbiddenError'; } },
    ConflictError:  class ConflictError  extends Error { constructor(m) { super(m); this.name = 'ConflictError';  } },
    ValidationError:class ValidationError extends Error { constructor(m) { super(m); this.name = 'ValidationError';} },
}));

jest.unstable_mockModule('../../../core/services/notification.service.js', () => ({
    NotificationService: {
        send:  jest.fn(),
        TYPES: { TASK_SCORED: 'task_scored' },
    },
}));

jest.unstable_mockModule('../../../core/services/audit.service.js', () => ({
    recordAudit:   jest.fn(),
    recordFailure: jest.fn(),
}));

jest.unstable_mockModule('../../../domain/base/task_enums.js', () => ({
    TaskSource:   { SELF: 'self', TEACHER_NEW: 'teacher_new' },
    WritingStatus:{ SUBMITTED: 'SUBMITTED', REVIEWED: 'REVIEWED', ASSIGNED: 'ASSIGNED', SCORED: 'SCORED' },
}));

jest.unstable_mockModule('../../../domain/base/audit_enums.js', () => ({
    AuditAction: { TEACHER_TASK_REVIEWED: 'TEACHER_TASK_REVIEWED' },
}));

jest.unstable_mockModule('../../../core/logger/logger.js', () => ({
    default: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ─── Import SUT after mocks ───────────────────────────────────────────────────

const { teacherGetTaskUC }    = await import('../../../app/teacher_uc/teacher_get_task.uc.js');
const { teacherReviewTaskUC } = await import('../../../app/teacher_uc/teacher_review_task.uc.js');

const taskRepo = await import('../../../infrastructure/repositories/task_repo.js');
const { NotificationService } = await import('../../../core/services/notification.service.js');
const auditSvc = await import('../../../core/services/audit.service.js');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeTask = (overrides = {}) => ({
    _id:            'task-1',
    id:             'task-1',
    _title:         'Test Essay',
    _status:        'SUBMITTED',
    _source:        'teacher_new',
    _assignedBy:    'tch-1',
    _assignedTo:    'stu-1',
    ...overrides,
});

const makeTeacher = (overrides = {}) => ({
    _id: 'tch-1', id: 'tch-1', _name: 'Ms. Smith', ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// teacherGetTaskUC
// ─────────────────────────────────────────────────────────────────────────────

describe('teacherGetTaskUC', () => {
    beforeEach(() => jest.clearAllMocks());

    // ── Assigned task status access ───────────────────────────────────────────

    it('returns an ASSIGNED task when it was teacher-assigned', async () => {
        taskRepo.findTaskByID.mockResolvedValue(makeTask({ _status: 'ASSIGNED' }));
        const result = await teacherGetTaskUC('task-1');
        expect(result._status).toBe('ASSIGNED');
    });

    it('returns a SUBMITTED assigned task', async () => {
        taskRepo.findTaskByID.mockResolvedValue(makeTask({ _status: 'SUBMITTED' }));
        const result = await teacherGetTaskUC('task-1');
        expect(result._status).toBe('SUBMITTED');
    });

    it('returns a SCORED assigned task', async () => {
        taskRepo.findTaskByID.mockResolvedValue(makeTask({ _status: 'SCORED' }));
        const result = await teacherGetTaskUC('task-1');
        expect(result._status).toBe('SCORED');
    });

    // ── Pool task status access ────────────────────────────────────────────────

    it('returns a SUBMITTED pool (self-created) task', async () => {
        taskRepo.findTaskByID.mockResolvedValue(
            makeTask({ _status: 'SUBMITTED', _source: 'self', _assignedBy: null })
        );
        const result = await teacherGetTaskUC('task-1');
        expect(result._status).toBe('SUBMITTED');
    });

    it('returns a REVIEWED pool task', async () => {
        taskRepo.findTaskByID.mockResolvedValue(
            makeTask({ _status: 'REVIEWED', _source: 'self', _assignedBy: null })
        );
        const result = await teacherGetTaskUC('task-1');
        expect(result._status).toBe('REVIEWED');
    });

    it('throws TaskOwnershipError for a DRAFT pool task', async () => {
        taskRepo.findTaskByID.mockResolvedValue(
            makeTask({ _status: 'DRAFT', _source: 'self', _assignedBy: null })
        );
        await expect(teacherGetTaskUC('task-1')).rejects.toMatchObject({ name: 'TaskOwnershipError' });
    });

    it('throws TaskOwnershipError for an ASSIGNED pool task (wrong status for pool)', async () => {
        taskRepo.findTaskByID.mockResolvedValue(
            makeTask({ _status: 'ASSIGNED', _source: 'self', _assignedBy: null })
        );
        await expect(teacherGetTaskUC('task-1')).rejects.toMatchObject({ name: 'TaskOwnershipError' });
    });

    // ── Repo errors ────────────────────────────────────────────────────────────

    it('propagates TaskNotFoundError from the repo', async () => {
        taskRepo.findTaskByID.mockRejectedValue(new Error('TaskNotFoundError'));
        await expect(teacherGetTaskUC('bad-id')).rejects.toThrow('TaskNotFoundError');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// teacherReviewTaskUC
// ─────────────────────────────────────────────────────────────────────────────

describe('teacherReviewTaskUC', () => {
    const validInput = { taskId: 'task-1', bandScore: 7, feedback: 'Good work' };

    beforeEach(() => {
        jest.clearAllMocks();
        taskRepo.findTaskByID.mockResolvedValue(makeTask());
        taskRepo.reviewTask.mockResolvedValue(makeTask({ _status: 'REVIEWED' }));
        taskRepo.scoreTask.mockResolvedValue(makeTask({ _status: 'SCORED', _bandScore: 7 }));
    });

    // ── Happy path ────────────────────────────────────────────────────────────

    it('reviews then scores the task and returns the scored result', async () => {
        const result = await teacherReviewTaskUC(makeTeacher(), validInput);
        expect(taskRepo.reviewTask).toHaveBeenCalledWith('task-1', 'Good work');
        expect(taskRepo.scoreTask).toHaveBeenCalledWith('task-1', 7);
        expect(result._status).toBe('SCORED');
    });

    it('calls reviewTask before scoreTask (correct order)', async () => {
        await teacherReviewTaskUC(makeTeacher(), validInput);
        const reviewOrder = taskRepo.reviewTask.mock.invocationCallOrder[0];
        const scoreOrder  = taskRepo.scoreTask.mock.invocationCallOrder[0];
        expect(reviewOrder).toBeLessThan(scoreOrder);
    });

    it('sends a TASK_SCORED notification to the student', async () => {
        await teacherReviewTaskUC(makeTeacher(), validInput);
        expect(NotificationService.send).toHaveBeenCalledWith(
            expect.objectContaining({ recipientId: 'stu-1', type: 'task_scored' })
        );
    });

    it('records a success audit after scoring', async () => {
        await teacherReviewTaskUC(makeTeacher(), validInput);
        expect(auditSvc.recordAudit).toHaveBeenCalledWith(
            'TEACHER_TASK_REVIEWED', 'tch-1',
            expect.objectContaining({ taskId: 'task-1', bandScore: 7 }),
            null,
        );
    });

    it('trims feedback before passing to reviewTask', async () => {
        await teacherReviewTaskUC(makeTeacher(), { ...validInput, feedback: '  Well done  ' });
        expect(taskRepo.reviewTask).toHaveBeenCalledWith('task-1', 'Well done');
    });

    it('handles bandScore of 0 (falsy but valid)', async () => {
        taskRepo.scoreTask.mockResolvedValue(makeTask({ _bandScore: 0 }));
        await teacherReviewTaskUC(makeTeacher(), { ...validInput, bandScore: 0 });
        expect(taskRepo.scoreTask).toHaveBeenCalledWith('task-1', 0);
    });

    // ── Ownership / source guards ──────────────────────────────────────────────

    it('throws ForbiddenError for a self-created task', async () => {
        taskRepo.findTaskByID.mockResolvedValue(
            makeTask({ _source: 'self', _assignedBy: null })
        );
        await expect(teacherReviewTaskUC(makeTeacher(), validInput))
            .rejects.toMatchObject({ name: 'ForbiddenError' });
        expect(auditSvc.recordFailure).toHaveBeenCalledTimes(1);
        expect(taskRepo.reviewTask).not.toHaveBeenCalled();
    });

    it('throws ForbiddenError when a different teacher tries to review', async () => {
        taskRepo.findTaskByID.mockResolvedValue(makeTask({ _assignedBy: 'other-tch' }));
        await expect(teacherReviewTaskUC(makeTeacher(), validInput))
            .rejects.toMatchObject({ name: 'ForbiddenError' });
        expect(auditSvc.recordFailure).toHaveBeenCalledTimes(1);
    });

    // ── Status guard ───────────────────────────────────────────────────────────

    it('throws ConflictError when task is not in SUBMITTED status', async () => {
        taskRepo.findTaskByID.mockResolvedValue(makeTask({ _status: 'ASSIGNED' }));
        await expect(teacherReviewTaskUC(makeTeacher(), validInput))
            .rejects.toMatchObject({ name: 'ConflictError' });
        expect(auditSvc.recordFailure).toHaveBeenCalledTimes(1);
        expect(taskRepo.reviewTask).not.toHaveBeenCalled();
    });

    it('throws ConflictError for an already SCORED task', async () => {
        taskRepo.findTaskByID.mockResolvedValue(makeTask({ _status: 'SCORED' }));
        await expect(teacherReviewTaskUC(makeTeacher(), validInput))
            .rejects.toMatchObject({ name: 'ConflictError' });
    });

    // ── Input validation ───────────────────────────────────────────────────────

    it('throws ValidationError when feedback is empty', async () => {
        await expect(teacherReviewTaskUC(makeTeacher(), { ...validInput, feedback: '' }))
            .rejects.toMatchObject({ name: 'ValidationError' });
        expect(taskRepo.reviewTask).not.toHaveBeenCalled();
    });

    it('throws ValidationError when feedback is only whitespace', async () => {
        await expect(teacherReviewTaskUC(makeTeacher(), { ...validInput, feedback: '   ' }))
            .rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('throws ValidationError when bandScore is above 9', async () => {
        await expect(teacherReviewTaskUC(makeTeacher(), { ...validInput, bandScore: 10 }))
            .rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('throws ValidationError when bandScore is negative', async () => {
        await expect(teacherReviewTaskUC(makeTeacher(), { ...validInput, bandScore: -1 }))
            .rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('throws ValidationError when bandScore is not a number', async () => {
        await expect(teacherReviewTaskUC(makeTeacher(), { ...validInput, bandScore: 'excellent' }))
            .rejects.toMatchObject({ name: 'ValidationError' });
    });

    // ── Not found ─────────────────────────────────────────────────────────────

    it('throws NotFoundError when task does not exist', async () => {
        taskRepo.findTaskByID.mockResolvedValue(null);
        await expect(teacherReviewTaskUC(makeTeacher(), validInput))
            .rejects.toMatchObject({ name: 'NotFoundError' });
    });

    it('passes req to recordAudit when provided', async () => {
        const req = { ip: '127.0.0.1' };
        await teacherReviewTaskUC(makeTeacher(), validInput, req);
        expect(auditSvc.recordAudit).toHaveBeenCalledWith(
            expect.anything(), expect.anything(), expect.anything(), req
        );
    });
});