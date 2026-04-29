import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLog     = jest.fn();
const mockFailure = jest.fn();
const mockFindLogs = jest.fn();

jest.mock('../logger/audit.logger.js', () => ({
    default: { log: mockLog, failure: mockFailure },
}));

jest.mock('../../infrastructure/repositories/audit_log_repo.js', () => ({
    findLogs: mockFindLogs,
}));

// Import after mocks are in place
const {
    recordAudit,
    recordFailure,
    getAuditLogs,
    getAuditActionList,
} = await import('./audit.service.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_ACTION      = 'auth.login';
const MOCK_REQUESTER   = 'user-123';
const MOCK_DETAILS     = { ip: '127.0.0.1' };
const MOCK_REQ         = { headers: {} };
const PAGINATED_RESULT = { logs: [], total: 0, page: 1, limit: 20, pages: 0 };

beforeEach(() => {
    jest.clearAllMocks();
    mockFindLogs.mockResolvedValue(PAGINATED_RESULT);
});

// ===========================================================================
// recordAudit
// ===========================================================================

describe('recordAudit', () => {
    it('calls auditLogger.log with action, requesterId, and spread details', () => {
        recordAudit(MOCK_ACTION, MOCK_REQUESTER, MOCK_DETAILS, MOCK_REQ);

        expect(mockLog).toHaveBeenCalledTimes(1);
        expect(mockLog).toHaveBeenCalledWith(
            MOCK_ACTION,
            { requesterId: MOCK_REQUESTER, ...MOCK_DETAILS },
            MOCK_REQ,
        );
    });

    it('works with default empty details', () => {
        recordAudit(MOCK_ACTION, MOCK_REQUESTER);

        expect(mockLog).toHaveBeenCalledWith(
            MOCK_ACTION,
            { requesterId: MOCK_REQUESTER },
            null,
        );
    });

    it('passes req as null when omitted', () => {
        recordAudit(MOCK_ACTION, MOCK_REQUESTER, MOCK_DETAILS);

        const [, , reqArg] = mockLog.mock.calls[0];
        expect(reqArg).toBeNull();
    });
});

// ===========================================================================
// recordFailure
// ===========================================================================

describe('recordFailure', () => {
    it('calls auditLogger.failure with action, requesterId, and spread details', () => {
        recordFailure(MOCK_ACTION, MOCK_REQUESTER, MOCK_DETAILS, MOCK_REQ);

        expect(mockFailure).toHaveBeenCalledTimes(1);
        expect(mockFailure).toHaveBeenCalledWith(
            MOCK_ACTION,
            { requesterId: MOCK_REQUESTER, ...MOCK_DETAILS },
            MOCK_REQ,
        );
    });

    it('works with default empty details', () => {
        recordFailure(MOCK_ACTION, MOCK_REQUESTER);

        expect(mockFailure).toHaveBeenCalledWith(
            MOCK_ACTION,
            { requesterId: MOCK_REQUESTER },
            null,
        );
    });

    it('does NOT call auditLogger.log', () => {
        recordFailure(MOCK_ACTION, MOCK_REQUESTER);
        expect(mockLog).not.toHaveBeenCalled();
    });
});

// ===========================================================================
// getAuditLogs
// ===========================================================================

describe('getAuditLogs', () => {

    // -----------------------------------------------------------------------
    // Passthrough behaviour
    // -----------------------------------------------------------------------

    it('returns the value resolved by findLogs', async () => {
        const result = await getAuditLogs({});
        expect(result).toEqual(PAGINATED_RESULT);
    });

    it('forwards arbitrary rest filters (page, limit, sort …) to findLogs', async () => {
        const filters = { page: 2, limit: 50, sort: 'desc', outcome: 'success' };
        await getAuditLogs(filters);

        expect(mockFindLogs).toHaveBeenCalledWith(
            expect.objectContaining({ page: 2, limit: 50, sort: 'desc', outcome: 'success' }),
        );
    });

    // -----------------------------------------------------------------------
    // Explicit action wins over category
    // -----------------------------------------------------------------------

    it('passes action directly when supplied and ignores category', async () => {
        await getAuditLogs({ action: 'auth.logout', category: 'admin' });

        expect(mockFindLogs).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'auth.logout' }),
        );
        expect(mockFindLogs).toHaveBeenCalledWith(
            expect.not.objectContaining({ actionPrefix: expect.anything() }),
        );
    });

    // -----------------------------------------------------------------------
    // Category → actionPrefix mapping
    // -----------------------------------------------------------------------

    const CATEGORY_CASES = [
        ['auth',    'auth.'],
        ['admin',   'admin.'],
        ['user',    'user.'],
        ['task',    'writingTask.'],
        ['teacher', 'teacher.'],
        ['vocab',   'vocab.'],
        ['profile', 'profile.'],
    ];

    test.each(CATEGORY_CASES)(
        'maps category "%s" to actionPrefix "%s" when no action is given',
        async (category, expectedPrefix) => {
            await getAuditLogs({ category });

            expect(mockFindLogs).toHaveBeenCalledWith(
                expect.objectContaining({ actionPrefix: expectedPrefix }),
            );
            expect(mockFindLogs).toHaveBeenCalledWith(
                expect.not.objectContaining({ action: expect.anything() }),
            );
        },
    );

    it('passes neither action nor actionPrefix when no action or category is given', async () => {
        await getAuditLogs({ page: 1 });

        expect(mockFindLogs).toHaveBeenCalledWith({ page: 1 });
    });

    it('strips category from the payload forwarded to findLogs', async () => {
        await getAuditLogs({ category: 'auth', page: 1 });

        expect(mockFindLogs).toHaveBeenCalledWith(
            expect.not.objectContaining({ category: expect.anything() }),
        );
    });

    it('handles an unknown category gracefully (no actionPrefix added)', async () => {
        await getAuditLogs({ category: 'unknown_category' });

        expect(mockFindLogs).toHaveBeenCalledWith({});
        expect(mockFindLogs).toHaveBeenCalledWith(
            expect.not.objectContaining({ actionPrefix: expect.anything() }),
        );
    });

    it('calls findLogs with no filters when invoked with no arguments', async () => {
        await getAuditLogs();
        expect(mockFindLogs).toHaveBeenCalledWith({});
    });

    // -----------------------------------------------------------------------
    // Error propagation
    // -----------------------------------------------------------------------

    it('propagates errors thrown by findLogs', async () => {
        mockFindLogs.mockRejectedValueOnce(new Error('DB error'));
        await expect(getAuditLogs({})).rejects.toThrow('DB error');
    });
});

// ===========================================================================
// getAuditActionList
// ===========================================================================

describe('getAuditActionList', () => {
    // We don't own AuditAction, so we only assert shape rather than
    // hard-coding specific enum values.

    it('returns an array', () => {
        const list = getAuditActionList();
        expect(Array.isArray(list)).toBe(true);
    });

    it('every entry has key, value, and category fields', () => {
        const list = getAuditActionList();
        expect(list.length).toBeGreaterThan(0);

        for (const entry of list) {
            expect(entry).toHaveProperty('key');
            expect(entry).toHaveProperty('value');
            expect(entry).toHaveProperty('category');
            expect(typeof entry.key).toBe('string');
            expect(typeof entry.value).toBe('string');
            expect(typeof entry.category).toBe('string');
        }
    });

    it('category is derived from the first dot-separated segment of value', () => {
        const list = getAuditActionList();

        for (const entry of list) {
            expect(entry.category).toBe(entry.value.split('.')[0]);
        }
    });

    it('returns a new array on each call (not a cached reference)', () => {
        const a = getAuditActionList();
        const b = getAuditActionList();
        expect(a).not.toBe(b);
    });
});