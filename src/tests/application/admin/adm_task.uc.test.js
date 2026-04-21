// src/tests/application/admin/adm_task.uc.test.js
// Covers: delete content (hard), list tasks, search tasks, review, score, transfer tasks

import { jest } from '@jest/globals';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo.js', () => ({
    findTaskByID:       jest.fn(),
    deleteTask:         jest.fn(),
    reviewTask:         jest.fn(),
    scoreTask:          jest.fn(),
    searchTasksByTitle: jest.fn(),
    findTasks:          jest.fn(),
    transferTasks:      jest.fn(),
}));

jest.unstable_mockModule('../../../infrastructure/repositories/user_repo.js', () => ({
    findUserById: jest.fn(),
}));

jest.unstable_mockModule('../../../domain/models/task_model.js', () => ({
    default: {
        find: jest.fn(() => ({
            sort:  function () { return this; },
            skip:  function () { return this; },
            limit: function () { return this; },
            lean:  jest.fn().mockResolvedValue([]),
        })),
    },
}));

jest.unstable_mockModule('../../../core/logger/logger.js', () => ({
    default: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ─── Import SUT after mocks ───────────────────────────────────────────────────

const { admDeleteContentUC }    = await import('../../../app/admin/adm_delete_content.uc.js');
const { adminListTasksUC }      = await import('../../../app/admin/adm_list_task.uc.js');
const { adminSearchTasksUC }    = await import('../../../app/admin/adm_search_task.uc.js');
const { adminReviewTaskUC }     = await import('../../../app/admin/adm_review_task.uc.js');
const { adminScoreTaskUC }      = await import('../../../app/admin/adm_score_task.uc.js');
const { adminTransferTasksUC }  = await import('../../../app/admin/adm_transfer_tasks.uc.js');

const taskRepo        = await import('../../../infrastructure/repositories/task_repo.js');
const userRepo        = await import('../../../infrastructure/repositories/user_repo.js');
const TaskModelModule = await import('../../../domain/models/task_model.js');
const TaskModel       = TaskModelModule.default;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeTask = (overrides = {}) => ({
    id:         'task-1',
    _title:     'Test Essay',
    _status:    'SUBMITTED',
    _bandScore: null,
    _updatedAt: new Date(),
    _userId:    'user-1',
    ...overrides,
});

// ─── admDeleteContentUC (hard-delete) ─────────────────────────────────────────

describe('admDeleteContentUC', () => {
    beforeEach(() => jest.clearAllMocks());

    it('verifies task exists, then hard-deletes it', async () => {
        taskRepo.findTaskByID.mockResolvedValue(makeTask());
        taskRepo.deleteTask.mockResolvedValue(undefined);

        const result = await admDeleteContentUC('task-1');
        expect(taskRepo.findTaskByID).toHaveBeenCalledWith('task-1');
        expect(taskRepo.deleteTask).toHaveBeenCalledWith('task-1');
        expect(result).toEqual({ deleted: true, taskId: 'task-1' });
    });

    it('propagates TaskNotFoundError when task does not exist', async () => {
        taskRepo.findTaskByID.mockRejectedValue(new Error('TaskNotFoundError'));
        await expect(admDeleteContentUC('bad-id')).rejects.toThrow('TaskNotFoundError');
        expect(taskRepo.deleteTask).not.toHaveBeenCalled();
    });
});

// ─── adminListTasksUC ─────────────────────────────────────────────────────────

describe('adminListTasksUC', () => {
    let chainMock;

    beforeEach(() => {
        jest.clearAllMocks();
        chainMock = {
            sort:  jest.fn().mockReturnThis(),
            skip:  jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            lean:  jest.fn().mockResolvedValue([makeTask(), makeTask({ id: 'task-2' })]),
        };
        TaskModel.find.mockReturnValue(chainMock);
    });

    it('returns all tasks when no status filter is given', async () => {
        const result = await adminListTasksUC();
        expect(TaskModel.find).toHaveBeenCalledWith({});
        expect(result).toHaveLength(2);
    });

    it('applies status filter when provided', async () => {
        await adminListTasksUC({ status: 'SCORED' });
        expect(TaskModel.find).toHaveBeenCalledWith({ status: 'SCORED' });
    });

    it('uses default page=1 and limit=50', async () => {
        await adminListTasksUC();
        expect(chainMock.skip).toHaveBeenCalledWith(0);
        expect(chainMock.limit).toHaveBeenCalledWith(50);
    });

    it('applies correct pagination for page 2', async () => {
        await adminListTasksUC({ page: 2, limit: 10 });
        expect(chainMock.skip).toHaveBeenCalledWith(10);
        expect(chainMock.limit).toHaveBeenCalledWith(10);
    });
});

// ─── adminSearchTasksUC ───────────────────────────────────────────────────────

describe('adminSearchTasksUC', () => {
    beforeEach(() => jest.clearAllMocks());

    it('searches by title when q is provided', async () => {
        const tasks = [makeTask({ _title: 'Essay about AI' })];
        taskRepo.searchTasksByTitle.mockResolvedValue(tasks);

        const result = await adminSearchTasksUC({ q: 'AI' });
        expect(taskRepo.searchTasksByTitle).toHaveBeenCalledWith('AI');
        expect(result).toHaveLength(1);
    });

    it('post-filters by status when both q and status are provided', async () => {
        const tasks = [
            makeTask({ _status: 'SUBMITTED' }),
            makeTask({ id: 'task-2', _status: 'SCORED' }),
        ];
        taskRepo.searchTasksByTitle.mockResolvedValue(tasks);

        const result = await adminSearchTasksUC({ q: 'essay', status: 'SUBMITTED' });
        expect(result).toHaveLength(1);
        expect(result[0]._status).toBe('SUBMITTED');
    });

    it('falls back to findTasks when no query is provided', async () => {
        taskRepo.findTasks.mockResolvedValue([makeTask()]);
        await adminSearchTasksUC({ status: 'DRAFT' });
        expect(taskRepo.findTasks).toHaveBeenCalled();
        expect(taskRepo.searchTasksByTitle).not.toHaveBeenCalled();
    });

    it('returns all tasks when neither q nor status is provided', async () => {
        taskRepo.findTasks.mockResolvedValue([makeTask(), makeTask({ id: 'task-2' })]);
        const result = await adminSearchTasksUC();
        expect(result).toHaveLength(2);
    });
});

// ─── adminReviewTaskUC ────────────────────────────────────────────────────────

describe('adminReviewTaskUC', () => {
    beforeEach(() => jest.clearAllMocks());

    it('delegates review to the repo and returns the reviewed task', async () => {
        const reviewed = makeTask({ _status: 'REVIEWED' });
        taskRepo.reviewTask.mockResolvedValue(reviewed);

        const result = await adminReviewTaskUC('task-1', { feedback: 'Good work' });
        expect(taskRepo.reviewTask).toHaveBeenCalledWith('task-1', 'Good work');
        expect(result._status).toBe('REVIEWED');
    });

    it('propagates errors from the repo (e.g. wrong status)', async () => {
        taskRepo.reviewTask.mockRejectedValue(new Error('Task is not in SUBMITTED status'));
        await expect(
            adminReviewTaskUC('task-1', { feedback: 'Late feedback' })
        ).rejects.toThrow('Task is not in SUBMITTED status');
    });
});

// ─── adminScoreTaskUC ─────────────────────────────────────────────────────────

describe('adminScoreTaskUC', () => {
    beforeEach(() => jest.clearAllMocks());

    it('delegates scoring to the repo', async () => {
        const scored = makeTask({ _status: 'SCORED', _bandScore: 7.5 });
        taskRepo.scoreTask.mockResolvedValue(scored);

        const result = await adminScoreTaskUC('task-1', { bandScore: 7.5 });
        expect(taskRepo.scoreTask).toHaveBeenCalledWith('task-1', 7.5);
        expect(result._bandScore).toBe(7.5);
    });

    it('handles a band score of 0 (falsy but valid)', async () => {
        const scored = makeTask({ _bandScore: 0 });
        taskRepo.scoreTask.mockResolvedValue(scored);

        const result = await adminScoreTaskUC('task-1', { bandScore: 0 });
        expect(taskRepo.scoreTask).toHaveBeenCalledWith('task-1', 0);
        expect(result._bandScore).toBe(0);
    });

    it('propagates errors when task is not in REVIEWED status', async () => {
        taskRepo.scoreTask.mockRejectedValue(new Error('Task must be REVIEWED before scoring'));
        await expect(adminScoreTaskUC('task-1', { bandScore: 6 })).rejects.toThrow(
            'Task must be REVIEWED before scoring'
        );
    });
});

// ─── adminTransferTasksUC ─────────────────────────────────────────────────────

describe('adminTransferTasksUC', () => {
    beforeEach(() => jest.clearAllMocks());

    it('validates both users then transfers tasks', async () => {
        userRepo.findUserById.mockResolvedValue({ id: 'user' });
        taskRepo.transferTasks.mockResolvedValue({ transferred: 5 });

        const result = await adminTransferTasksUC({ fromUserId: 'u1', toUserId: 'u2' });
        expect(userRepo.findUserById).toHaveBeenCalledWith('u1');
        expect(userRepo.findUserById).toHaveBeenCalledWith('u2');
        expect(taskRepo.transferTasks).toHaveBeenCalledWith('u1', 'u2');
        expect(result).toEqual({ transferred: 5 });
    });

    it('throws when the source user does not exist', async () => {
        userRepo.findUserById.mockRejectedValueOnce(new Error('UserNotFoundError'));
        await expect(
            adminTransferTasksUC({ fromUserId: 'bad', toUserId: 'u2' })
        ).rejects.toThrow('UserNotFoundError');
        expect(taskRepo.transferTasks).not.toHaveBeenCalled();
    });

    it('throws when the target user does not exist', async () => {
        userRepo.findUserById
            .mockResolvedValueOnce({ id: 'u1' })
            .mockRejectedValueOnce(new Error('UserNotFoundError'));
        await expect(
            adminTransferTasksUC({ fromUserId: 'u1', toUserId: 'bad' })
        ).rejects.toThrow('UserNotFoundError');
        expect(taskRepo.transferTasks).not.toHaveBeenCalled();
    });
});