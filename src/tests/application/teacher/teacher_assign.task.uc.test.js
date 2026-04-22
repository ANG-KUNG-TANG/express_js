// src/tests/application/teacher_uc/teacher_assign_task.uc.test.js
import { jest } from '@jest/globals';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo.js', () => ({
    findById:         jest.fn(),
    findOneByTopic:   jest.fn(),
    createTask:       jest.fn(),
    createManyTasks:  jest.fn(),
}));

jest.unstable_mockModule('../../../infrastructure/repositories/user_repo.js', () => ({
    findById:               jest.fn(),
    findStudentsByTeacher:  jest.fn(),
}));

jest.unstable_mockModule('../../../core/services/notification.service.js', () => ({
    NotificationService: {
        send:       jest.fn(),
        sendToMany: jest.fn(),
        TYPES:      { TASK_ASSIGNED: 'task_assigned' },
    },
}));

jest.unstable_mockModule('../../../core/services/audit.service.js', () => ({
    recordAudit:   jest.fn(),
    recordFailure: jest.fn(),
}));

jest.unstable_mockModule('../../../domain/base/task_enums.js', () => ({
    TaskSource:       { TEACHER_NEW: 'teacher_new', TEACHER_EXISTING: 'teacher_existing', TEACHER_TOPIC: 'teacher_topic', SELF: 'self' },
    AssignmentStatus: { PENDING_ACCEPTANCE: 'PENDING_ACCEPTANCE', ACCEPTED: 'ACCEPTED', DECLINED: 'DECLINED' },
}));

jest.unstable_mockModule('../../../domain/base/audit_enums.js', () => ({
    AuditAction: { TEACHER_TASK_ASSIGNED: 'TEACHER_TASK_ASSIGNED' },
}));

jest.unstable_mockModule('../../../interfaces/http_status.js', () => ({
    HTTP_STATUS: { BAD_REQUEST: 400, NOT_FOUND: 404, FORBIDDEN: 403 },
}));

jest.unstable_mockModule('../../../core/logger/logger.js', () => ({
    default: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ─── Import SUT after mocks ───────────────────────────────────────────────────

const { teacherAssignTaskUC } = await import('../../../app/teacher_uc/teacher_assign_task.uc.js');

const taskRepo = await import('../../../infrastructure/repositories/task_repo.js');
const userRepo = await import('../../../infrastructure/repositories/user_repo.js');
const { NotificationService } = await import('../../../core/services/notification.service.js');
const auditSvc = await import('../../../core/services/audit.service.js');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeTeacher = (overrides = {}) => ({
    _id: 'tch-1', id: 'tch-1', _name: 'Ms. Smith', ...overrides,
});

const makeStudent = (overrides = {}) => ({
    _id: 'stu-1', id: 'stu-1',
    _assignedTeacher: 'tch-1', assignedTeacher: 'tch-1',
    ...overrides,
});

const makeTask = (overrides = {}) => ({
    _id: 'task-1', id: 'task-1',
    _title: 'Existing Essay', title: 'Existing Essay',
    _questionPrompt: 'Discuss...', questionPrompt: 'Discuss...',
    _taskType: 'TASK_2', taskType: 'TASK_2',
    _examType: 'ACADEMIC', examType: 'ACADEMIC',
    ...overrides,
});

const baseBody = {
    taskSource:    'teacher_new',
    title:         'Essay on AI',
    questionPrompt:'Discuss the impact of AI',
    taskType:      'TASK_2',
    examType:      'ACADEMIC',
};

// ─── MODE: teacher_new (single) ───────────────────────────────────────────────

describe('teacherAssignTaskUC — teacher_new / single student', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        userRepo.findById.mockResolvedValue(makeStudent());
        taskRepo.createTask.mockResolvedValue(makeTask());
    });

    it('creates and returns the assigned task', async () => {
        const result = await teacherAssignTaskUC(
            makeTeacher(),
            { ...baseBody, studentId: 'stu-1' }
        );
        expect(taskRepo.createTask).toHaveBeenCalledTimes(1);
        expect(result).toEqual(expect.objectContaining({ id: 'task-1' }));
    });

    it('trims title and questionPrompt before storing', async () => {
        await teacherAssignTaskUC(makeTeacher(), {
            ...baseBody,
            studentId:     'stu-1',
            title:         '  Essay  ',
            questionPrompt:'  Discuss  ',
        });
        const payload = taskRepo.createTask.mock.calls[0][0];
        expect(payload.title).toBe('Essay');
        expect(payload.questionPrompt).toBe('Discuss');
    });

    it('sets assignmentStatus to PENDING_ACCEPTANCE', async () => {
        await teacherAssignTaskUC(makeTeacher(), { ...baseBody, studentId: 'stu-1' });
        const payload = taskRepo.createTask.mock.calls[0][0];
        expect(payload.assignmentStatus).toBe('PENDING_ACCEPTANCE');
    });

    it('sends notifications to both the student and teacher', async () => {
        await teacherAssignTaskUC(makeTeacher(), { ...baseBody, studentId: 'stu-1' });
        expect(NotificationService.send).toHaveBeenCalledTimes(2);
        const calls = NotificationService.send.mock.calls.map(c => c[0].recipientId);
        expect(calls).toContain('stu-1');
        expect(calls).toContain('tch-1');
    });

    it('calls recordAudit on success', async () => {
        await teacherAssignTaskUC(makeTeacher(), { ...baseBody, studentId: 'stu-1' });
        expect(auditSvc.recordAudit).toHaveBeenCalledTimes(1);
        expect(auditSvc.recordAudit).toHaveBeenCalledWith(
            'TEACHER_TASK_ASSIGNED',
            'tch-1',
            expect.objectContaining({ bulk: false, studentId: 'stu-1' }),
            null,
        );
    });

    it('throws and calls recordFailure when student is not linked to this teacher', async () => {
        userRepo.findById.mockResolvedValue(makeStudent({ _assignedTeacher: 'other-tch' }));
        await expect(
            teacherAssignTaskUC(makeTeacher(), { ...baseBody, studentId: 'stu-1' })
        ).rejects.toThrow(/not assigned to you/i);
        expect(auditSvc.recordFailure).toHaveBeenCalledTimes(1);
        expect(taskRepo.createTask).not.toHaveBeenCalled();
    });

    it('throws 404 when student is not found', async () => {
        userRepo.findById.mockResolvedValue(null);
        const err = await teacherAssignTaskUC(makeTeacher(), { ...baseBody, studentId: 'bad-id' })
            .catch(e => e);
        expect(err.statusCode).toBe(404);
    });

    it('throws when title is missing in teacher_new mode', async () => {
        await expect(
            teacherAssignTaskUC(makeTeacher(), { ...baseBody, studentId: 'stu-1', title: '' })
        ).rejects.toThrow(/title is required/i);
    });

    it('throws when questionPrompt is missing in teacher_new mode', async () => {
        await expect(
            teacherAssignTaskUC(makeTeacher(), { ...baseBody, studentId: 'stu-1', questionPrompt: '' })
        ).rejects.toThrow(/questionPrompt is required/i);
    });

    it('attaches dueDate to payload when provided', async () => {
        const dueDate = '2025-12-31';
        await teacherAssignTaskUC(makeTeacher(), { ...baseBody, studentId: 'stu-1', dueDate });
        const payload = taskRepo.createTask.mock.calls[0][0];
        expect(payload.dueDate).toBeInstanceOf(Date);
    });
});

// ─── MODE: teacher_new (bulk) ─────────────────────────────────────────────────

describe('teacherAssignTaskUC — teacher_new / bulk', () => {
    const twoStudents = [makeStudent({ _id: 's1', id: 's1' }), makeStudent({ _id: 's2', id: 's2' })];

    beforeEach(() => {
        jest.clearAllMocks();
        userRepo.findStudentsByTeacher.mockResolvedValue(twoStudents);
        taskRepo.createManyTasks.mockResolvedValue([makeTask(), makeTask({ _id: 'task-2', id: 'task-2' })]);
    });

    it('creates one task per student and returns count', async () => {
        const result = await teacherAssignTaskUC(makeTeacher(), baseBody);
        expect(taskRepo.createManyTasks).toHaveBeenCalledTimes(1);
        const payloads = taskRepo.createManyTasks.mock.calls[0][0];
        expect(payloads).toHaveLength(2);
        expect(result).toEqual(expect.objectContaining({ assigned: 2 }));
    });

    it('calls sendToMany with all student IDs', async () => {
        await teacherAssignTaskUC(makeTeacher(), baseBody);
        expect(NotificationService.sendToMany).toHaveBeenCalledTimes(1);
        const [recipientIds] = NotificationService.sendToMany.mock.calls[0];
        expect(recipientIds).toContain('s1');
        expect(recipientIds).toContain('s2');
    });

    it('records audit with bulk: true', async () => {
        await teacherAssignTaskUC(makeTeacher(), baseBody);
        expect(auditSvc.recordAudit).toHaveBeenCalledWith(
            'TEACHER_TASK_ASSIGNED', 'tch-1',
            expect.objectContaining({ bulk: true, count: 2 }),
            null,
        );
    });

    it('throws when teacher has no students', async () => {
        userRepo.findStudentsByTeacher.mockResolvedValue([]);
        await expect(teacherAssignTaskUC(makeTeacher(), baseBody))
            .rejects.toThrow(/no students/i);
        expect(taskRepo.createManyTasks).not.toHaveBeenCalled();
    });
});

// ─── MODE: teacher_existing ───────────────────────────────────────────────────

describe('teacherAssignTaskUC — teacher_existing / single', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        userRepo.findById.mockResolvedValue(makeStudent());
        taskRepo.findById.mockResolvedValue(makeTask());
        taskRepo.createTask.mockResolvedValue(makeTask());
    });

    it('fetches existing task data and uses it for the new assignment', async () => {
        await teacherAssignTaskUC(makeTeacher(), {
            taskSource: 'teacher_existing',
            taskId:     'task-1',
            studentId:  'stu-1',
        });
        expect(taskRepo.findById).toHaveBeenCalledWith('task-1');
        const payload = taskRepo.createTask.mock.calls[0][0];
        expect(payload.title).toBe('Existing Essay');
    });

    it('throws when taskId is missing', async () => {
        await expect(
            teacherAssignTaskUC(makeTeacher(), { taskSource: 'teacher_existing', studentId: 'stu-1' })
        ).rejects.toThrow(/taskId is required/i);
    });

    it('throws 404 when existing task is not found', async () => {
        taskRepo.findById.mockResolvedValue(null);
        const err = await teacherAssignTaskUC(makeTeacher(), {
            taskSource: 'teacher_existing', taskId: 'bad', studentId: 'stu-1',
        }).catch(e => e);
        expect(err.statusCode).toBe(404);
    });
});

// ─── MODE: teacher_topic ──────────────────────────────────────────────────────

describe('teacherAssignTaskUC — teacher_topic / single', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        userRepo.findById.mockResolvedValue(makeStudent());
        taskRepo.createTask.mockResolvedValue(makeTask());
    });

    it('uses matched topic task data when a match is found', async () => {
        taskRepo.findOneByTopic.mockResolvedValue(makeTask({ title: 'Climate Change', _title: 'Climate Change' }));
        await teacherAssignTaskUC(makeTeacher(), {
            taskSource: 'teacher_topic', topic: 'Climate Change', studentId: 'stu-1',
        });
        const payload = taskRepo.createTask.mock.calls[0][0];
        expect(payload.title).toBe('Climate Change');
    });

    it('falls back to keyword as title when no topic match exists', async () => {
        taskRepo.findOneByTopic.mockResolvedValue(null);
        await teacherAssignTaskUC(makeTeacher(), {
            taskSource: 'teacher_topic', topic: 'Renewable Energy', studentId: 'stu-1',
        });
        const payload = taskRepo.createTask.mock.calls[0][0];
        expect(payload.title).toBe('renewable energy');
        expect(payload.questionPrompt).toMatch(/renewable energy/i);
    });

    it('lowercases topic keyword', async () => {
        taskRepo.findOneByTopic.mockResolvedValue(null);
        await teacherAssignTaskUC(makeTeacher(), {
            taskSource: 'teacher_topic', topic: 'ENVIRONMENT', studentId: 'stu-1',
        });
        expect(taskRepo.findOneByTopic).toHaveBeenCalledWith('environment');
    });

    it('throws when topic is missing', async () => {
        await expect(
            teacherAssignTaskUC(makeTeacher(), { taskSource: 'teacher_topic', studentId: 'stu-1' })
        ).rejects.toThrow(/topic is required/i);
    });
});

// ─── Unknown taskSource ───────────────────────────────────────────────────────

describe('teacherAssignTaskUC — unknown taskSource', () => {
    it('throws for an unrecognised taskSource value', async () => {
        await expect(
            teacherAssignTaskUC(makeTeacher(), { taskSource: 'magic_mode', studentId: 'stu-1' })
        ).rejects.toThrow(/Unknown taskSource/i);
    });
});