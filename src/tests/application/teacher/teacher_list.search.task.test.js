// src/tests/application/teacher_uc/teacher_list_search.uc.test.js
import { jest } from '@jest/globals';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo.js', () => ({
    findByAssignedBy: jest.fn(),
}));

jest.unstable_mockModule('../../../infrastructure/repositories/user_repo.js', () => ({
    findAll:      jest.fn(),
    sanitizeUser: jest.fn((u) => ({ id: u.id ?? u._id, name: u._name })),
}));

jest.unstable_mockModule('../../../core/services/redis.service.js', () => ({
    redisGet: jest.fn(),
    redisSet: jest.fn(),
    redisDel: jest.fn(),
    CacheKeys: {
        teacherTaskList:    (id) => `teacher:${id}:tasks`,
        teacherStudentList: (id) => `teacher:${id}:students`,
    },
    TTL: { TASK_LIST: 60 },
}));

jest.unstable_mockModule('../../../domain/base/task_enums.js', () => ({
    WritingStatus: {
        SUBMITTED: 'SUBMITTED',
        REVIEWED:  'REVIEWED',
        ASSIGNED:  'ASSIGNED',
        WRITING:   'WRITING',
        SCORED:    'SCORED',
    },
    AssignmentStatus: {
        PENDING_ACCEPTANCE: 'PENDING_ACCEPTANCE',
        ACCEPTED:           'ACCEPTED',
        DECLINED:           'DECLINED',
    },
}));

jest.unstable_mockModule('../../../core/logger/logger.js', () => ({
    default: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ─── Import SUT after mocks ───────────────────────────────────────────────────

const { teacherListTasksUC }         = await import('../../../app/teacher_uc/teacher_list_tasks.uc.js');
const { teacherListStudentsUC }      = await import('../../../app/teacher_uc/teacher_list_students.uc.js');
const { teacherListAssignedTasksUC } = await import('../../../app/teacher_uc/teacher_list_assign_tasks.uc.js');
const { teacherSearchTasksUC }       = await import('../../../app/teacher_uc/teacher_search_tasks.uc.js');

const taskRepo = await import('../../../infrastructure/repositories/task_repo.js');
const userRepo = await import('../../../infrastructure/repositories/user_repo.js');
const redisSvc = await import('../../../core/services/redis.service.js');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeTeacher = (overrides = {}) => ({ _id: 'tch-1', id: 'tch-1', ...overrides });

const makeStudent = (overrides = {}) => ({
    _id: 'stu-1', id: 'stu-1', _name: 'Alice', _role: 'user', role: 'user',
    _assignedTeacher: 'tch-1', ...overrides,
});

const makeTask = (overrides = {}) => ({
    _id: 'task-1', id: 'task-1', _status: 'SUBMITTED', _assignmentStatus: 'PENDING_ACCEPTANCE',
    ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// teacherListTasksUC
// ─────────────────────────────────────────────────────────────────────────────

describe('teacherListTasksUC', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns cached result immediately when cache hits', async () => {
        const cached = [makeTask()];
        redisSvc.redisGet.mockResolvedValue(cached);

        const result = await teacherListTasksUC({ teacherId: 'tch-1' });
        expect(result).toBe(cached);
        expect(taskRepo.findByAssignedBy).not.toHaveBeenCalled();
    });

    it('fetches from DB on cache miss and stores result', async () => {
        redisSvc.redisGet.mockResolvedValue(null);
        const tasks = [makeTask(), makeTask({ id: 'task-2' })];
        taskRepo.findByAssignedBy.mockResolvedValue(tasks);

        const result = await teacherListTasksUC({ teacherId: 'tch-1' });
        expect(taskRepo.findByAssignedBy).toHaveBeenCalledWith('tch-1', {}, { page: undefined, limit: undefined });
        expect(redisSvc.redisSet).toHaveBeenCalledTimes(1);
        expect(result).toBe(tasks);
    });

    it('passes status filter to findByAssignedBy when valid', async () => {
        redisSvc.redisGet.mockResolvedValue(null);
        taskRepo.findByAssignedBy.mockResolvedValue([]);

        await teacherListTasksUC({ teacherId: 'tch-1', status: 'SUBMITTED' });
        expect(taskRepo.findByAssignedBy).toHaveBeenCalledWith(
            'tch-1',
            { status: 'SUBMITTED' },
            expect.anything(),
        );
    });

    it('ignores invalid status values (no filter applied)', async () => {
        redisSvc.redisGet.mockResolvedValue(null);
        taskRepo.findByAssignedBy.mockResolvedValue([]);

        await teacherListTasksUC({ teacherId: 'tch-1', status: 'BOGUS' });
        expect(taskRepo.findByAssignedBy).toHaveBeenCalledWith('tch-1', {}, expect.anything());
    });

    it('uses different cache keys for different status/page/limit combinations', async () => {
        redisSvc.redisGet.mockResolvedValue(null);
        taskRepo.findByAssignedBy.mockResolvedValue([]);

        await teacherListTasksUC({ teacherId: 'tch-1', status: 'SUBMITTED', page: 1, limit: 10 });
        await teacherListTasksUC({ teacherId: 'tch-1', status: 'REVIEWED',  page: 2, limit: 10 });

        const keys = redisSvc.redisGet.mock.calls.map(c => c[0]);
        expect(keys[0]).not.toBe(keys[1]);
    });

    it('propagates repo errors', async () => {
        redisSvc.redisGet.mockResolvedValue(null);
        taskRepo.findByAssignedBy.mockRejectedValue(new Error('DB error'));
        await expect(teacherListTasksUC({ teacherId: 'tch-1' })).rejects.toThrow('DB error');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// teacherListStudentsUC
// ─────────────────────────────────────────────────────────────────────────────

describe('teacherListStudentsUC — no stats (default)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns cached result on cache hit', async () => {
        const cached = [{ id: 'stu-1', name: 'Alice' }];
        redisSvc.redisGet.mockResolvedValue(cached);

        const result = await teacherListStudentsUC(makeTeacher());
        expect(result).toBe(cached);
        expect(userRepo.findAll).not.toHaveBeenCalled();
    });

    it('fetches, sanitizes, caches, and returns students on cache miss', async () => {
        redisSvc.redisGet.mockResolvedValue(null);
        userRepo.findAll.mockResolvedValue([makeStudent()]);

        const result = await teacherListStudentsUC(makeTeacher());
        expect(userRepo.findAll).toHaveBeenCalledWith({ assignedTeacher: 'tch-1' });
        expect(redisSvc.redisSet).toHaveBeenCalledTimes(1);
        expect(result).toHaveLength(1);
    });

    it('filters out teachers and admins from linked users', async () => {
        redisSvc.redisGet.mockResolvedValue(null);
        userRepo.findAll.mockResolvedValue([
            makeStudent({ id: 'stu-1', _role: 'user'    }),
            makeStudent({ id: 'tch-2', _role: 'teacher' }),
            makeStudent({ id: 'adm-3', _role: 'admin'   }),
        ]);

        const result = await teacherListStudentsUC(makeTeacher());
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('stu-1');
    });

    it('returns empty array when teacher has no students', async () => {
        redisSvc.redisGet.mockResolvedValue(null);
        userRepo.findAll.mockResolvedValue([]);

        const result = await teacherListStudentsUC(makeTeacher());
        expect(result).toEqual([]);
    });
});

describe('teacherListStudentsUC — with stats (includeTaskStats: true)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('skips cache and enriches each student with taskStats', async () => {
        userRepo.findAll.mockResolvedValue([makeStudent()]);
        taskRepo.findByAssignedBy.mockResolvedValue([
            makeTask({ _status: 'SUBMITTED' }),
            makeTask({ _status: 'SCORED',   _assignmentStatus: 'ACCEPTED' }),
            makeTask({ _status: 'ASSIGNED', _assignmentStatus: 'PENDING_ACCEPTANCE' }),
        ]);

        const result = await teacherListStudentsUC(makeTeacher(), { includeTaskStats: true });

        expect(redisSvc.redisGet).not.toHaveBeenCalled();
        expect(redisSvc.redisSet).not.toHaveBeenCalled();
        expect(result[0]).toHaveProperty('taskStats');
        expect(result[0].taskStats.total).toBe(3);
        expect(result[0].taskStats.submitted).toBe(1);
        expect(result[0].taskStats.scored).toBe(1);
        expect(result[0].taskStats.assigned).toBe(1);
    });

    it('returns pending and declined counts from assignmentStatus', async () => {
        userRepo.findAll.mockResolvedValue([makeStudent()]);
        taskRepo.findByAssignedBy.mockResolvedValue([
            makeTask({ _assignmentStatus: 'PENDING_ACCEPTANCE' }),
            makeTask({ _assignmentStatus: 'DECLINED'           }),
        ]);

        const result = await teacherListStudentsUC(makeTeacher(), { includeTaskStats: true });
        expect(result[0].taskStats.pending).toBe(1);
        expect(result[0].taskStats.declined).toBe(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// teacherListAssignedTasksUC
// ─────────────────────────────────────────────────────────────────────────────

describe('teacherListAssignedTasksUC', () => {
    const teacher = makeTeacher();

    beforeEach(() => jest.clearAllMocks());

    it('returns tasks with default pagination', async () => {
        const tasks = [makeTask(), makeTask({ id: 'task-2' })];
        taskRepo.findByAssignedBy.mockResolvedValue(tasks);

        const result = await teacherListAssignedTasksUC(teacher);
        expect(taskRepo.findByAssignedBy).toHaveBeenCalledWith('tch-1', {}, { page: 1, limit: 20 });
        expect(result.tasks).toBe(tasks);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(20);
    });

    it('passes studentId filter to the repo', async () => {
        taskRepo.findByAssignedBy.mockResolvedValue([]);
        await teacherListAssignedTasksUC(teacher, { studentId: 'stu-2' });
        expect(taskRepo.findByAssignedBy).toHaveBeenCalledWith(
            'tch-1',
            expect.objectContaining({ assignedTo: 'stu-2' }),
            expect.anything(),
        );
    });

    it('passes status filter to the repo', async () => {
        taskRepo.findByAssignedBy.mockResolvedValue([]);
        await teacherListAssignedTasksUC(teacher, { status: 'SUBMITTED' });
        expect(taskRepo.findByAssignedBy).toHaveBeenCalledWith(
            'tch-1',
            expect.objectContaining({ status: 'SUBMITTED' }),
            expect.anything(),
        );
    });

    it('passes assignmentStatus filter to the repo', async () => {
        taskRepo.findByAssignedBy.mockResolvedValue([]);
        await teacherListAssignedTasksUC(teacher, { assignmentStatus: 'DECLINED' });
        expect(taskRepo.findByAssignedBy).toHaveBeenCalledWith(
            'tch-1',
            expect.objectContaining({ assignmentStatus: 'DECLINED' }),
            expect.anything(),
        );
    });

    it('throws on invalid WritingStatus value', async () => {
        await expect(
            teacherListAssignedTasksUC(teacher, { status: 'NONSENSE' })
        ).rejects.toThrow(/Invalid status/i);
        expect(taskRepo.findByAssignedBy).not.toHaveBeenCalled();
    });

    it('throws on invalid AssignmentStatus value', async () => {
        await expect(
            teacherListAssignedTasksUC(teacher, { assignmentStatus: 'NONSENSE' })
        ).rejects.toThrow(/Invalid assignmentStatus/i);
    });

    it('respects custom page and limit', async () => {
        taskRepo.findByAssignedBy.mockResolvedValue([]);
        const result = await teacherListAssignedTasksUC(teacher, { page: 3, limit: 5 });
        expect(result.page).toBe(3);
        expect(result.limit).toBe(5);
        expect(taskRepo.findByAssignedBy).toHaveBeenCalledWith(
            'tch-1', {}, { page: 3, limit: 5 }
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// teacherSearchTasksUC
// ─────────────────────────────────────────────────────────────────────────────

describe('teacherSearchTasksUC', () => {
    beforeEach(() => jest.clearAllMocks());

    it('passes a case-insensitive regex filter when q is provided', async () => {
        taskRepo.findByAssignedBy.mockResolvedValue([makeTask()]);

        const result = await teacherSearchTasksUC({ teacherId: 'tch-1', q: 'climate' });
        expect(taskRepo.findByAssignedBy).toHaveBeenCalledWith('tch-1', {
            title: { $regex: 'climate', $options: 'i' },
        });
        expect(result).toHaveLength(1);
    });

    it('trims whitespace from q before building the filter', async () => {
        taskRepo.findByAssignedBy.mockResolvedValue([]);
        await teacherSearchTasksUC({ teacherId: 'tch-1', q: '  essay  ' });
        expect(taskRepo.findByAssignedBy).toHaveBeenCalledWith('tch-1', {
            title: { $regex: 'essay', $options: 'i' },
        });
    });

    it('passes empty filter when q is not provided', async () => {
        taskRepo.findByAssignedBy.mockResolvedValue([]);
        await teacherSearchTasksUC({ teacherId: 'tch-1' });
        expect(taskRepo.findByAssignedBy).toHaveBeenCalledWith('tch-1', {});
    });

    it('passes empty filter when q is only whitespace', async () => {
        taskRepo.findByAssignedBy.mockResolvedValue([]);
        await teacherSearchTasksUC({ teacherId: 'tch-1', q: '   ' });
        expect(taskRepo.findByAssignedBy).toHaveBeenCalledWith('tch-1', {});
    });

    it('returns empty array when no tasks match', async () => {
        taskRepo.findByAssignedBy.mockResolvedValue([]);
        const result = await teacherSearchTasksUC({ teacherId: 'tch-1', q: 'nonexistent' });
        expect(result).toEqual([]);
    });

    it('propagates repo errors', async () => {
        taskRepo.findByAssignedBy.mockRejectedValue(new Error('DB error'));
        await expect(teacherSearchTasksUC({ teacherId: 'tch-1', q: 'test' }))
            .rejects.toThrow('DB error');
    });
});