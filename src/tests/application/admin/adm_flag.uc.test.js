// src/tests/application/admin/adm_flag.uc.test.js
// Covers: flag content, soft-delete flag (adm_delete_flag), list flags, resolve flag

import { jest } from '@jest/globals';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo.js', () => ({
    findTaskByID: jest.fn(),
    updateTask:   jest.fn(),
}));

jest.unstable_mockModule('../../../infrastructure/repositories/content_flag_repo.js', () => ({
    createFlag:  jest.fn(),
    findFlags:   jest.fn(),
    resolveFlag: jest.fn(),
}));

jest.unstable_mockModule('../../../domain/base/task_enums.js', () => ({
    WritingStatus: {
        DRAFT:     'DRAFT',
        SUBMITTED: 'SUBMITTED',
        REVIEWED:  'REVIEWED',
        SCORED:    'SCORED',
        DELETED:   'deleted',
    },
}));

jest.unstable_mockModule('../../../core/logger/logger.js', () => ({
    default: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ─── Import SUT after mocks ───────────────────────────────────────────────────

const { admFlagContentUC }    = await import('../../../app/admin/adm_flag_content.uc.js');
const { admDeleteContentUC: admSoftDeleteUC } = await import('../../../app/admin/adm_delete_flag.uc.js');
const { admListFlagsUC }      = await import('../../../app/admin/adm_list_flags.uc.js');
const { admResolveFlagUC }    = await import('../../../app/admin/adm_resolve_flag.uc.js');

const taskRepo = await import('../../../infrastructure/repositories/task_repo.js');
const flagRepo = await import('../../../infrastructure/repositories/content_flag_repo.js');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeTask = (overrides = {}) => ({
    id:     'task-1',
    title:  'Test Essay',
    _title: 'Test Essay',
    ...overrides,
});

const makeFlag = (overrides = {}) => ({
    id:       'flag-1',
    taskId:   'task-1',
    flaggedBy: 'admin-1',
    reason:   'Inappropriate content',
    severity: 'medium',
    status:   'open',
    ...overrides,
});

// ─── admFlagContentUC ─────────────────────────────────────────────────────────

describe('admFlagContentUC', () => {
    beforeEach(() => jest.clearAllMocks());

    it('verifies task exists, creates a flag, and returns it', async () => {
        const task = makeTask();
        const flag = makeFlag();
        taskRepo.findTaskByID.mockResolvedValue(task);
        flagRepo.createFlag.mockResolvedValue(flag);

        const result = await admFlagContentUC('admin-1', 'task-1', 'Offensive content', 'high');
        expect(taskRepo.findTaskByID).toHaveBeenCalledWith('task-1');
        expect(flagRepo.createFlag).toHaveBeenCalledWith(
            expect.objectContaining({
                taskId:    'task-1',
                flaggedBy: 'admin-1',
                reason:    'Offensive content',
                severity:  'high',
            })
        );
        expect(result).toEqual(flag);
    });

    it('uses "medium" as the default severity', async () => {
        taskRepo.findTaskByID.mockResolvedValue(makeTask());
        flagRepo.createFlag.mockResolvedValue(makeFlag());

        await admFlagContentUC('admin-1', 'task-1', 'Some reason');
        expect(flagRepo.createFlag).toHaveBeenCalledWith(
            expect.objectContaining({ severity: 'medium' })
        );
    });

    it('includes task title in the flag payload', async () => {
        taskRepo.findTaskByID.mockResolvedValue(makeTask({ title: 'My Essay', _title: 'My Essay' }));
        flagRepo.createFlag.mockResolvedValue(makeFlag());

        await admFlagContentUC('admin-1', 'task-1', 'reason');
        expect(flagRepo.createFlag).toHaveBeenCalledWith(
            expect.objectContaining({ taskTitle: 'My Essay' })
        );
    });

    it('propagates TaskNotFoundError before creating a flag', async () => {
        taskRepo.findTaskByID.mockRejectedValue(new Error('TaskNotFoundError'));
        await expect(
            admFlagContentUC('admin-1', 'bad-id', 'reason')
        ).rejects.toThrow('TaskNotFoundError');
        expect(flagRepo.createFlag).not.toHaveBeenCalled();
    });
});

// ─── admDeleteContentUC (soft-delete / adm_delete_flag) ───────────────────────

describe('admSoftDeleteUC (adm_delete_flag)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('verifies task exists, then soft-deletes by setting status to "deleted"', async () => {
        const task    = makeTask();
        const updated = makeTask({ status: 'deleted' });
        taskRepo.findTaskByID.mockResolvedValue(task);
        taskRepo.updateTask.mockResolvedValue(updated);

        const result = await admSoftDeleteUC('task-1');
        expect(taskRepo.findTaskByID).toHaveBeenCalledWith('task-1');
        expect(taskRepo.updateTask).toHaveBeenCalledWith(
            'task-1',
            expect.objectContaining({ status: expect.stringMatching(/deleted/i) })
        );
        expect(result).toEqual(updated);
    });

    it('propagates TaskNotFoundError without calling updateTask', async () => {
        taskRepo.findTaskByID.mockRejectedValue(new Error('TaskNotFoundError'));
        await expect(admSoftDeleteUC('bad-id')).rejects.toThrow('TaskNotFoundError');
        expect(taskRepo.updateTask).not.toHaveBeenCalled();
    });
});

// ─── admListFlagsUC ───────────────────────────────────────────────────────────

describe('admListFlagsUC', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns all flags when no options are provided', async () => {
        const flags = [makeFlag(), makeFlag({ id: 'flag-2' })];
        flagRepo.findFlags.mockResolvedValue(flags);

        const result = await admListFlagsUC();
        expect(flagRepo.findFlags).toHaveBeenCalledWith({});
        expect(result).toHaveLength(2);
    });

    it('passes filter options to the repo', async () => {
        flagRepo.findFlags.mockResolvedValue([]);
        await admListFlagsUC({ status: 'open', severity: 'high', page: 2, limit: 10 });
        expect(flagRepo.findFlags).toHaveBeenCalledWith({
            status: 'open', severity: 'high', page: 2, limit: 10,
        });
    });

    it('returns an empty array when no flags match', async () => {
        flagRepo.findFlags.mockResolvedValue([]);
        const result = await admListFlagsUC({ status: 'resolved' });
        expect(result).toEqual([]);
    });

    it('propagates repo errors', async () => {
        flagRepo.findFlags.mockRejectedValue(new Error('DB error'));
        await expect(admListFlagsUC()).rejects.toThrow('DB error');
    });
});

// ─── admResolveFlagUC ─────────────────────────────────────────────────────────

describe('admResolveFlagUC', () => {
    beforeEach(() => jest.clearAllMocks());

    it('resolves a flag and returns the updated flag', async () => {
        const resolved = makeFlag({ status: 'resolved', resolvedBy: 'admin-1' });
        flagRepo.resolveFlag.mockResolvedValue(resolved);

        const result = await admResolveFlagUC('admin-1', 'flag-1');
        expect(flagRepo.resolveFlag).toHaveBeenCalledWith('flag-1', 'admin-1');
        expect(result.status).toBe('resolved');
    });

    it('propagates ContentFlagNotFoundError', async () => {
        flagRepo.resolveFlag.mockRejectedValue(new Error('ContentFlagNotFoundError'));
        await expect(admResolveFlagUC('admin-1', 'bad-flag')).rejects.toThrow(
            'ContentFlagNotFoundError'
        );
    });

    it('propagates ContentFlagAlreadyResolvedError', async () => {
        flagRepo.resolveFlag.mockRejectedValue(new Error('ContentFlagAlreadyResolvedError'));
        await expect(admResolveFlagUC('admin-1', 'flag-1')).rejects.toThrow(
            'ContentFlagAlreadyResolvedError'
        );
    });
});