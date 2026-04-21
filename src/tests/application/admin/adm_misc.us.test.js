// src/tests/application/admin/admin_misc.uc.test.js
// Covers: list audit logs, send notification, dashboard stats

import { jest } from '@jest/globals';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.unstable_mockModule('../../../infrastructure/repositories/audit_log_repo.js', () => ({
    findLogs: jest.fn(),
}));

jest.unstable_mockModule('../../../app/notification/send_noti.uc.js', () => ({
    sendNotificationUseCase: jest.fn(),
}));

jest.unstable_mockModule('../../../infrastructure/repositories/user_repo.js', () => ({
    findAll: jest.fn(),
}));

jest.unstable_mockModule('../../../domain/models/user_model.js', () => ({
    default: {
        aggregate: jest.fn(),
    },
}));

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo.js', () => ({
    findTasks: jest.fn(),
}));

jest.unstable_mockModule('../../../domain/base/user_enums.js', () => ({
    UserRole: { ADMIN: 'admin', TEACHER: 'teacher', USER: 'user' },
}));

jest.unstable_mockModule('../../../core/logger/logger.js', () => ({
    default: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ─── Import SUT after mocks ───────────────────────────────────────────────────

const { admListAuditLogsUC }    = await import('../../../app/admin/adm_list_audit_logs.uc.js');
const { admSendNotificationUC } = await import('../../../app/admin/adm_send_noti.uc.js');
const { getDashboardStatsUC }   = await import('../../../app/admin/stats.uc.js');

const auditRepo                   = await import('../../../infrastructure/repositories/audit_log_repo.js');
const { sendNotificationUseCase } = await import('../../../app/notification/send_noti.uc.js');
const userRepo                    = await import('../../../infrastructure/repositories/user_repo.js');
const taskRepo                    = await import('../../../infrastructure/repositories/task_repo.js');
const UserModelModule             = await import('../../../domain/models/user_model.js');
const UserModel                   = UserModelModule.default;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeTask = (overrides = {}) => ({
    id:         'task-1',
    _status:    'SUBMITTED',
    _title:     'Essay',
    _bandScore: null,
    _updatedAt: new Date(),
    _userId:    'user-1',
    ...overrides,
});

const makeUserAgg = (overrides = {}) => [{
    total:       [{ n: 10 }],
    admins:      [{ n: 1  }],
    teachers:    [{ n: 3  }],
    newThisWeek: [{ n: 2  }],
    ...overrides,
}];

// ─── admListAuditLogsUC ───────────────────────────────────────────────────────

describe('admListAuditLogsUC', () => {
    beforeEach(() => jest.clearAllMocks());

    it('calls findLogs with no options by default', async () => {
        const payload = { logs: [], total: 0, page: 1, limit: 20, pages: 0 };
        auditRepo.findLogs.mockResolvedValue(payload);

        const result = await admListAuditLogsUC();
        expect(auditRepo.findLogs).toHaveBeenCalledWith({});
        expect(result).toEqual(payload);
    });

    it('passes all filter options through to findLogs', async () => {
        auditRepo.findLogs.mockResolvedValue({ logs: [] });
        const opts = {
            action: 'LOGIN', requesterId: 'u1', outcome: 'success',
            from: '2024-01-01', to: '2024-12-31', page: 2, limit: 25,
        };
        await admListAuditLogsUC(opts);
        expect(auditRepo.findLogs).toHaveBeenCalledWith(opts);
    });

    it('propagates repo errors', async () => {
        auditRepo.findLogs.mockRejectedValue(new Error('DB error'));
        await expect(admListAuditLogsUC()).rejects.toThrow('DB error');
    });
});

// ─── admSendNotificationUC ────────────────────────────────────────────────────

describe('admSendNotificationUC', () => {
    const baseParams = {
        audience: 'individual',
        targetUserId: 'user-99',
        type: 'info',
        title: 'Hello',
        message: 'Test message',
        senderId: 'admin-1',
    };

    beforeEach(() => jest.clearAllMocks());

    it('sends to a single user when audience is "individual"', async () => {
        sendNotificationUseCase.mockResolvedValue(undefined);

        const result = await admSendNotificationUC(baseParams);
        expect(sendNotificationUseCase).toHaveBeenCalledTimes(1);
        expect(sendNotificationUseCase).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 'user-99', type: 'info' })
        );
        expect(result).toEqual({ sent: 1, failed: 0 });
    });

    it('throws when audience is "individual" but targetUserId is missing', async () => {
        await expect(
            admSendNotificationUC({ ...baseParams, targetUserId: null })
        ).rejects.toThrow('targetUserId is required');
    });

    it('broadcasts to all teachers when audience is "teachers"', async () => {
        userRepo.findAll.mockResolvedValue([
            { id: 'tch-1' }, { id: 'tch-2' },
        ]);
        sendNotificationUseCase.mockResolvedValue(undefined);

        const result = await admSendNotificationUC({
            ...baseParams,
            audience: 'teachers',
            targetUserId: null,
        });
        expect(userRepo.findAll).toHaveBeenCalledWith({ role: 'teacher' });
        expect(sendNotificationUseCase).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ sent: 2, failed: 0 });
    });

    it('broadcasts to all students when audience is "students"', async () => {
        userRepo.findAll.mockResolvedValue([{ id: 'stu-1' }]);
        sendNotificationUseCase.mockResolvedValue(undefined);

        const result = await admSendNotificationUC({
            ...baseParams,
            audience: 'students',
            targetUserId: null,
        });
        expect(userRepo.findAll).toHaveBeenCalledWith({ role: 'user' });
        expect(result.sent).toBe(1);
    });

    it('fetches all users without role filter when audience is "all"', async () => {
        userRepo.findAll.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }]);
        sendNotificationUseCase.mockResolvedValue(undefined);

        const result = await admSendNotificationUC({
            ...baseParams,
            audience: 'all',
            targetUserId: null,
        });
        expect(userRepo.findAll).toHaveBeenCalledWith({});
        expect(result.sent).toBe(3);
    });

    it('returns { sent: 0, failed: 0 } when no recipients are found', async () => {
        userRepo.findAll.mockResolvedValue([]);
        const result = await admSendNotificationUC({
            ...baseParams,
            audience: 'students',
            targetUserId: null,
        });
        expect(result).toEqual({ sent: 0, failed: 0 });
        expect(sendNotificationUseCase).not.toHaveBeenCalled();
    });

    it('counts partial failures correctly via allSettled', async () => {
        userRepo.findAll.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
        sendNotificationUseCase
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error('Socket error'));

        const result = await admSendNotificationUC({
            ...baseParams,
            audience: 'students',
            targetUserId: null,
        });
        expect(result).toEqual({ sent: 1, failed: 1 });
    });

    it('throws when an invalid audience string is passed', async () => {
        await expect(
            admSendNotificationUC({ ...baseParams, audience: 'unknown' })
        ).rejects.toThrow('Invalid audience');
    });
});

// ─── getDashboardStatsUC ──────────────────────────────────────────────────────

describe('getDashboardStatsUC', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns correct user counts from the aggregation', async () => {
        UserModel.aggregate.mockResolvedValue(makeUserAgg());
        taskRepo.findTasks.mockResolvedValue([]);

        const result = await getDashboardStatsUC();
        expect(result.users.total).toBe(10);
        expect(result.users.admins).toBe(1);
        expect(result.users.teachers).toBe(3);
        expect(result.users.newThisWeek).toBe(2);
    });

    it('derives task counts by status correctly', async () => {
        UserModel.aggregate.mockResolvedValue(makeUserAgg());
        taskRepo.findTasks
            .mockResolvedValueOnce([
                makeTask({ _status: 'SUBMITTED' }),
                makeTask({ _status: 'REVIEWED' }),
                makeTask({ _status: 'REVIEWED' }),
                makeTask({ _status: 'SCORED' }),
                makeTask({ _status: 'DRAFT' }),
            ])
            .mockResolvedValueOnce([makeTask()]); // recent tasks

        const result = await getDashboardStatsUC();
        expect(result.tasks.total).toBe(5);
        expect(result.tasks.submitted).toBe(1);
        expect(result.tasks.reviewed).toBe(2);
        expect(result.tasks.scored).toBe(1);
        expect(result.tasks.draft).toBe(1);
    });

    it('returns recent tasks with the expected shape', async () => {
        UserModel.aggregate.mockResolvedValue(makeUserAgg());
        const recentTask = makeTask({ id: 'r-1', _title: 'Recent Essay', _bandScore: 7 });
        taskRepo.findTasks
            .mockResolvedValueOnce([recentTask])  // allTasks
            .mockResolvedValueOnce([recentTask]); // recentTasks

        const result = await getDashboardStatsUC();
        expect(result.recent).toHaveLength(1);
        expect(result.recent[0]).toMatchObject({
            id:        'r-1',
            title:     'Recent Essay',
            bandScore: 7,
        });
    });

    it('handles empty DB gracefully — all counts are 0', async () => {
        UserModel.aggregate.mockResolvedValue([{
            total: [], admins: [], teachers: [], newThisWeek: [],
        }]);
        taskRepo.findTasks.mockResolvedValue([]);

        const result = await getDashboardStatsUC();
        expect(result.users.total).toBe(0);
        expect(result.tasks.total).toBe(0);
        expect(result.recent).toEqual([]);
    });

    it('propagates errors from the aggregation', async () => {
        UserModel.aggregate.mockRejectedValue(new Error('Aggregation failed'));
        taskRepo.findTasks.mockResolvedValue([]);
        await expect(getDashboardStatsUC()).rejects.toThrow('Aggregation failed');
    });
});