// src/tests/services/audit.service.test.js

import { jest } from '@jest/globals';

// ── In ESM mode jest.mock() is not available.
// ── Use jest.unstable_mockModule() BEFORE any dynamic import of the module under test.

const mockLog      = jest.fn();
const mockFailure  = jest.fn();
const mockFindLogs = jest.fn();

jest.unstable_mockModule('../../../src/core/logger/audit.logger.js', () => ({
    default: { log: mockLog, failure: mockFailure },
}));

jest.unstable_mockModule('../../../src/infrastructure/repositories/audit_log_repo.js', () => ({
    findLogs: mockFindLogs,
}));

jest.unstable_mockModule('../../../src/domain/base/audit_enums.js', () => ({
    AuditAction: {
        TASK_CREATED:   'writingTask.created',
        TASK_DELETED:   'writingTask.deleted',
        USER_CREATED:   'user.created',
        USER_DELETED:   'user.deleted',
        ADMIN_PROMOTED: 'admin.promoted',
        AUTH_LOGIN:     'auth.login',
        TEACHER_ASSIGN: 'teacher.assign',
        VOCAB_CREATED:  'vocab.created',
        PROFILE_UPDATE: 'profile.update',
    },
}));

// Dynamic import MUST come after unstable_mockModule registrations
const {
    recordAudit,
    recordFailure,
    getAuditLogs,
    getAuditActionList,
} = await import('../../../src/core/services/audit.service.js');

describe('audit.service', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    describe('recordAudit', () => {
        it('delegates to auditLogger.log with correct shape', () => {
            recordAudit('writingTask.created', 'user-1', { taskId: 't-99' });
            expect(mockLog).toHaveBeenCalledTimes(1);
            expect(mockLog).toHaveBeenCalledWith(
                'writingTask.created',
                { requesterId: 'user-1', taskId: 't-99' },
                null,
            );
        });

        it('passes the req object through', () => {
            const fakeReq = { ip: '127.0.0.1' };
            recordAudit('auth.login', 'user-2', {}, fakeReq);
            expect(mockLog).toHaveBeenCalledWith('auth.login', { requesterId: 'user-2' }, fakeReq);
        });

        it('defaults details to {} and req to null', () => {
            recordAudit('user.created', 'user-3');
            expect(mockLog).toHaveBeenCalledWith('user.created', { requesterId: 'user-3' }, null);
        });
    });

    describe('recordFailure', () => {
        it('delegates to auditLogger.failure with correct shape', () => {
            recordFailure('auth.login', 'user-4', { reason: 'bad password' });
            expect(mockFailure).toHaveBeenCalledTimes(1);
            expect(mockFailure).toHaveBeenCalledWith(
                'auth.login',
                { requesterId: 'user-4', reason: 'bad password' },
                null,
            );
        });

        it('passes the req object through', () => {
            const fakeReq = { ip: '10.0.0.1' };
            recordFailure('auth.login', 'user-5', {}, fakeReq);
            expect(mockFailure).toHaveBeenCalledWith('auth.login', { requesterId: 'user-5' }, fakeReq);
        });
    });

    describe('getAuditLogs', () => {
        const mockResult = { logs: [], total: 0, page: 1, limit: 20, pages: 0 };

        it('passes plain filters to findLogs with no transformation', async () => {
            mockFindLogs.mockResolvedValueOnce(mockResult);
            await getAuditLogs({ page: 2, limit: 10 });
            expect(mockFindLogs).toHaveBeenCalledWith({ page: 2, limit: 10 });
        });

        it('resolves category → actionPrefix when no explicit action', async () => {
            mockFindLogs.mockResolvedValueOnce(mockResult);
            await getAuditLogs({ category: 'task' });
            expect(mockFindLogs).toHaveBeenCalledWith({ actionPrefix: 'writingTask.' });
        });

        it('resolves all known category prefixes correctly', async () => {
            const cases = [
                ['auth',    'auth.'],
                ['admin',   'admin.'],
                ['user',    'user.'],
                ['task',    'writingTask.'],
                ['teacher', 'teacher.'],
                ['vocab',   'vocab.'],
                ['profile', 'profile.'],
            ];
            for (const [category, prefix] of cases) {
                mockFindLogs.mockResolvedValueOnce(mockResult);
                await getAuditLogs({ category });
                expect(mockFindLogs).toHaveBeenLastCalledWith({ actionPrefix: prefix });
            }
        });

        it('explicit action wins over category', async () => {
            mockFindLogs.mockResolvedValueOnce(mockResult);
            await getAuditLogs({ category: 'task', action: 'writingTask.deleted' });
            expect(mockFindLogs).toHaveBeenCalledWith({ action: 'writingTask.deleted' });
        });

        it('unknown category results in no actionPrefix', async () => {
            mockFindLogs.mockResolvedValueOnce(mockResult);
            await getAuditLogs({ category: 'unknown' });
            expect(mockFindLogs).toHaveBeenCalledWith({});
        });

        it('returns the value from findLogs', async () => {
            const expected = { logs: [{ id: 'log-1' }], total: 1, page: 1, limit: 20, pages: 1 };
            mockFindLogs.mockResolvedValueOnce(expected);
            const result = await getAuditLogs({});
            expect(result).toEqual(expected);
        });
    });

    describe('getAuditActionList', () => {
        it('returns an array with entries', () => {
            const list = getAuditActionList();
            expect(Array.isArray(list)).toBe(true);
            expect(list.length).toBeGreaterThan(0);
        });

        it('each entry has key, value, and category fields', () => {
            for (const entry of getAuditActionList()) {
                expect(entry).toHaveProperty('key');
                expect(entry).toHaveProperty('value');
                expect(entry).toHaveProperty('category');
            }
        });

        it('category is the first dot-segment of value', () => {
            for (const entry of getAuditActionList()) {
                expect(entry.category).toBe(entry.value.split('.')[0]);
            }
        });

        it('contains expected TASK_CREATED entry', () => {
            const entry = getAuditActionList().find((e) => e.key === 'TASK_CREATED');
            expect(entry).toBeDefined();
            expect(entry.value).toBe('writingTask.created');
            expect(entry.category).toBe('writingTask');
        });
    });
});