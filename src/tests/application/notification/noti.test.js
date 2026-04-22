// src/tests/application/notification/noti.test.js

import { jest } from '@jest/globals';

// ─── Shared mock factories ────────────────────────────────────────────────────

const makeSavedNotification = (overrides = {}) => ({
    _id:       'noti-id-001',
    type:      'TASK_ASSIGNED',
    title:     'New task assigned',
    message:   'Test message',
    metadata:  {},
    createdAt: new Date('2025-01-01T00:00:00Z'),
    isRead:    false,
    ...overrides,
});

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../../infrastructure/repositories/notification_repo.js', () => ({
    notificationRepo: {
        create:       jest.fn(),
        deleteOne:    jest.fn(),
        findByUserId: jest.fn(),
        countUnread:  jest.fn(),
        markRead:     jest.fn(),
    },
}));

jest.mock('../../../core/services/socket.service.js', () => ({
    getIO: jest.fn(),
}));

jest.mock('../../../core/services/redis.service.js', () => ({
    redisGet:        jest.fn(),
    redisSet:        jest.fn(),
    redisDel:        jest.fn(),
    redisDelPattern: jest.fn(),
    CacheKeys: {
        userNotifications: (uid) => `notifications:${uid}`,
        unreadCount:       (uid) => `unread:${uid}`,
    },
    TTL: { NOTIFICATIONS: 60 },
}));

jest.mock('../../../domain/entities/notificaiton_entity.js', () => {
    const NotificationType = {
        TASK_ASSIGNED: 'TASK_ASSIGNED',
        TEST_RESULT:   'TEST_RESULT',
        EXAM_REMINDER: 'EXAM_REMINDER',
    };
    class Notification {
        constructor(data) { Object.assign(this, data); }
        toJSON() { return { ...this }; }
    }
    return { Notification, NotificationType };
});

jest.mock('../../../core/errors/notification.errors.js', () => ({
    NotificationNotFoundError: class NotificationNotFoundError extends Error {
        constructor(id) {
            super(`Notification not found: ${id}`);
            this.name = 'NotificationNotFoundError';
        }
    },
}));

// ─── Lazy imports ─────────────────────────────────────────────────────────────

const { notificationRepo }  = await import('../../../infrastructure/repositories/notification_repo.js');
const { getIO }             = await import('../../../core/services/socket.service.js');
const { redisGet, redisSet, redisDel, redisDelPattern } = await import('../../../core/services/redis.service.js');

const { sendNotificationUseCase }          = await import('../../../app/notification/send_noti.uc.js');
const { createTaskAssignedNotificationUC } = await import('../../../app/notification/create_noti.uc.js');
const { deleteNotiUc }                     = await import('../../../app/notification/delete_noti.uc.js');
const { getNotificationsUseCase }          = await import('../../../app/notification/get_noti.uc.js');
const { markNotiUc }                       = await import('../../../app/notification/mark_noti.uc.js');
const { notifyTestResultUseCase }          = await import('../../../app/notification/notify_test_result.uc.js');
const { notifyExamReminderUseCase }        = await import('../../../app/notification/notiy_task_reminder.uc.js');
const { NotificationNotFoundError }        = await import('../../../core/errors/notification.errors.js');

// ═════════════════════════════════════════════════════════════════════════════
// 1. sendNotificationUseCase
// ═════════════════════════════════════════════════════════════════════════════
describe('sendNotificationUseCase', () => {
    const BASE_INPUT = {
        userId:  'user-123',
        type:    'TASK_ASSIGNED',
        title:   'New task assigned',
        message: 'Ms. Smith assigned you a task.',
    };

    beforeEach(() => jest.clearAllMocks());

    it('persists the notification via the repo', async () => {
        notificationRepo.create.mockResolvedValue(makeSavedNotification());
        getIO.mockReturnValue(null);

        await sendNotificationUseCase(BASE_INPUT);

        expect(notificationRepo.create).toHaveBeenCalledTimes(1);
        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.userId).toBe('user-123');
        expect(entityArg.isRead).toBe(false);
    });

    it('returns the saved notification', async () => {
        const saved = makeSavedNotification();
        notificationRepo.create.mockResolvedValue(saved);
        getIO.mockReturnValue(null);

        const result = await sendNotificationUseCase(BASE_INPUT);
        expect(result).toBe(saved);
    });

    it('merges ctaText and ctaUrl into metadata', async () => {
        notificationRepo.create.mockResolvedValue(makeSavedNotification());
        getIO.mockReturnValue(null);

        await sendNotificationUseCase({
            ...BASE_INPUT,
            ctaText:  'View task',
            ctaUrl:   'https://app.example.com/tasks/1',
            metadata: { taskId: 'task-1' },
        });

        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.metadata).toMatchObject({
            taskId:  'task-1',
            ctaText: 'View task',
            ctaUrl:  'https://app.example.com/tasks/1',
        });
    });

    it('sets ctaText and ctaUrl to null when omitted', async () => {
        notificationRepo.create.mockResolvedValue(makeSavedNotification());
        getIO.mockReturnValue(null);

        await sendNotificationUseCase(BASE_INPUT);

        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.metadata.ctaText).toBeNull();
        expect(entityArg.metadata.ctaUrl).toBeNull();
    });

    it('emits notification:new via Socket.IO when io is available', async () => {
        const saved = makeSavedNotification({ _id: 'abc', title: 'New task assigned' });
        notificationRepo.create.mockResolvedValue(saved);

        const mockRoom = { emit: jest.fn() };
        const mockIo   = { to: jest.fn().mockReturnValue(mockRoom) };
        getIO.mockReturnValue(mockIo);

        await sendNotificationUseCase(BASE_INPUT);

        expect(mockIo.to).toHaveBeenCalledWith('user-123');
        expect(mockRoom.emit).toHaveBeenCalledWith('notification:new', expect.objectContaining({
            _id:    'abc',
            title:  'New task assigned',
            isRead: false,
        }));
    });

    it('does NOT emit when getIO returns null', async () => {
        notificationRepo.create.mockResolvedValue(makeSavedNotification());
        getIO.mockReturnValue(null);

        await expect(sendNotificationUseCase(BASE_INPUT)).resolves.not.toThrow();
    });

    it('uses saved._id if present, falls back to saved.id', async () => {
        const saved = { id: 'fallback-id', type: 'TASK_ASSIGNED', title: 'T', message: 'M', metadata: {}, createdAt: new Date() };
        notificationRepo.create.mockResolvedValue(saved);

        const mockRoom = { emit: jest.fn() };
        getIO.mockReturnValue({ to: jest.fn().mockReturnValue(mockRoom) });

        await sendNotificationUseCase(BASE_INPUT);

        const emitted = mockRoom.emit.mock.calls[0][1];
        expect(emitted._id).toBe('fallback-id');
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. createTaskAssignedNotificationUC
// ═════════════════════════════════════════════════════════════════════════════
describe('createTaskAssignedNotificationUC', () => {
    const BASE = {
        studentId:   'student-1',
        teacherName: 'Ms. Smith',
        taskId:      'task-99',
        taskTitle:   'IELTS Task 2',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.FRONTEND_URL = 'https://app.example.com';
        notificationRepo.create.mockResolvedValue(makeSavedNotification());
        getIO.mockReturnValue(null);
    });

    it('calls sendNotificationUseCase with TASK_ASSIGNED type', async () => {
        await createTaskAssignedNotificationUC(BASE);
        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.type).toBe('TASK_ASSIGNED');
    });

    it('sets userId to studentId', async () => {
        await createTaskAssignedNotificationUC(BASE);
        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.userId).toBe('student-1');
    });

    it('includes teacherName and taskTitle in the message', async () => {
        await createTaskAssignedNotificationUC(BASE);
        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.message).toContain('Ms. Smith');
        expect(entityArg.message).toContain('IELTS Task 2');
    });

    it('appends formatted due date when dueDate is provided', async () => {
        await createTaskAssignedNotificationUC({ ...BASE, dueDate: '2025-06-01T00:00:00Z' });
        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.message).toContain('Due:');
        expect(entityArg.message).toContain('2025');
    });

    it('does NOT include "Due:" when dueDate is omitted', async () => {
        await createTaskAssignedNotificationUC(BASE);
        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.message).not.toContain('Due:');
    });

    it('builds a CTA URL containing the taskId', async () => {
        await createTaskAssignedNotificationUC(BASE);
        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.metadata.ctaUrl).toContain('task-99');
    });

    it('stores taskId and teacherName in metadata', async () => {
        await createTaskAssignedNotificationUC(BASE);
        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.metadata).toMatchObject({ taskId: 'task-99', teacherName: 'Ms. Smith' });
    });

    it('sets metadata.dueDate to null when dueDate is omitted', async () => {
        await createTaskAssignedNotificationUC(BASE);
        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.metadata.dueDate).toBeNull();
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. deleteNotiUc
// ═════════════════════════════════════════════════════════════════════════════
describe('deleteNotiUc', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns { deleted: true } on successful deletion', async () => {
        notificationRepo.deleteOne.mockResolvedValue(true);
        redisDel.mockResolvedValue(undefined);
        redisDelPattern.mockResolvedValue(undefined);

        const result = await deleteNotiUc('user-1', 'noti-1');
        expect(result).toEqual({ deleted: true });
    });

    it('calls repo.deleteOne with correct userId and notificationId', async () => {
        notificationRepo.deleteOne.mockResolvedValue(true);
        redisDel.mockResolvedValue(undefined);
        redisDelPattern.mockResolvedValue(undefined);

        await deleteNotiUc('user-1', 'noti-42');
        expect(notificationRepo.deleteOne).toHaveBeenCalledWith('user-1', 'noti-42');
    });

    it('throws NotificationNotFoundError when repo returns falsy', async () => {
        notificationRepo.deleteOne.mockResolvedValue(null);
        await expect(deleteNotiUc('user-1', 'missing-noti')).rejects.toThrow(NotificationNotFoundError);
    });

    it('busts the notifications list cache after deletion', async () => {
        notificationRepo.deleteOne.mockResolvedValue(true);
        redisDel.mockResolvedValue(undefined);
        redisDelPattern.mockResolvedValue(undefined);

        await deleteNotiUc('user-1', 'noti-1');
        expect(redisDelPattern).toHaveBeenCalledWith(expect.stringContaining('user-1'));
    });

    it('busts the unread count cache after deletion', async () => {
        notificationRepo.deleteOne.mockResolvedValue(true);
        redisDel.mockResolvedValue(undefined);
        redisDelPattern.mockResolvedValue(undefined);

        await deleteNotiUc('user-1', 'noti-1');
        expect(redisDel).toHaveBeenCalledWith(expect.stringContaining('user-1'));
    });

    it('does NOT bust cache when deletion fails', async () => {
        notificationRepo.deleteOne.mockResolvedValue(null);
        await expect(deleteNotiUc('user-1', 'noti-1')).rejects.toThrow();
        expect(redisDel).not.toHaveBeenCalled();
        expect(redisDelPattern).not.toHaveBeenCalled();
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. getNotificationsUseCase
// ═════════════════════════════════════════════════════════════════════════════
describe('getNotificationsUseCase', () => {
    const NOTIFICATIONS = [
        { toJSON: () => ({ _id: 'n1', title: 'First' }) },
        { toJSON: () => ({ _id: 'n2', title: 'Second' }) },
    ];

    beforeEach(() => jest.clearAllMocks());

    it('returns cached result immediately when cache hits', async () => {
        const cached = { notifications: [], total: 0, page: 1, totalPages: 0, unreadCount: 0 };
        redisGet.mockResolvedValue(cached);

        const result = await getNotificationsUseCase('user-1');
        expect(result).toBe(cached);
        expect(notificationRepo.findByUserId).not.toHaveBeenCalled();
    });

    it('fetches from DB on cache miss', async () => {
        redisGet.mockResolvedValue(null);
        notificationRepo.findByUserId.mockResolvedValue({ notifications: NOTIFICATIONS, total: 2 });
        notificationRepo.countUnread.mockResolvedValue(1);
        redisSet.mockResolvedValue(undefined);

        await getNotificationsUseCase('user-1');
        expect(notificationRepo.findByUserId).toHaveBeenCalledWith('user-1', { page: 1, limit: 20 });
    });

    it('maps notifications via toJSON()', async () => {
        redisGet.mockResolvedValue(null);
        notificationRepo.findByUserId.mockResolvedValue({ notifications: NOTIFICATIONS, total: 2 });
        notificationRepo.countUnread.mockResolvedValue(0);
        redisSet.mockResolvedValue(undefined);

        const result = await getNotificationsUseCase('user-1');
        expect(result.notifications).toEqual([
            { _id: 'n1', title: 'First' },
            { _id: 'n2', title: 'Second' },
        ]);
    });

    it('calculates totalPages correctly', async () => {
        redisGet.mockResolvedValue(null);
        notificationRepo.findByUserId.mockResolvedValue({ notifications: NOTIFICATIONS, total: 45 });
        notificationRepo.countUnread.mockResolvedValue(5);
        redisSet.mockResolvedValue(undefined);

        const result = await getNotificationsUseCase('user-1', { page: 1, limit: 20 });
        expect(result.totalPages).toBe(3);
    });

    it('stores result in Redis after a DB fetch', async () => {
        redisGet.mockResolvedValue(null);
        notificationRepo.findByUserId.mockResolvedValue({ notifications: [], total: 0 });
        notificationRepo.countUnread.mockResolvedValue(0);
        redisSet.mockResolvedValue(undefined);

        await getNotificationsUseCase('user-1', { page: 2, limit: 10 });
        expect(redisSet).toHaveBeenCalledTimes(1);
    });

    it('uses page-specific cache key so different pages never collide', async () => {
        redisGet.mockResolvedValue(null);
        notificationRepo.findByUserId.mockResolvedValue({ notifications: [], total: 0 });
        notificationRepo.countUnread.mockResolvedValue(0);
        redisSet.mockResolvedValue(undefined);

        await getNotificationsUseCase('user-1', { page: 3, limit: 5 });

        const cacheKey = redisGet.mock.calls[0][0];
        expect(cacheKey).toContain('p3');
        expect(cacheKey).toContain('l5');
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. markNotiUc
// ═════════════════════════════════════════════════════════════════════════════
describe('markNotiUc', () => {
    beforeEach(() => jest.clearAllMocks());

    it('marks a list of specific IDs as read', async () => {
        notificationRepo.markRead.mockResolvedValue(2);
        redisDel.mockResolvedValue(undefined);
        redisDelPattern.mockResolvedValue(undefined);

        const result = await markNotiUc('user-1', ['noti-1', 'noti-2']);
        expect(result).toEqual({ updatedCount: 2 });
        expect(notificationRepo.markRead).toHaveBeenCalledWith('user-1', ['noti-1', 'noti-2']);
    });

    it('accepts the string "all" to mark every notification read', async () => {
        notificationRepo.markRead.mockResolvedValue(10);
        redisDel.mockResolvedValue(undefined);
        redisDelPattern.mockResolvedValue(undefined);

        const result = await markNotiUc('user-1', 'all');
        expect(result).toEqual({ updatedCount: 10 });
        expect(notificationRepo.markRead).toHaveBeenCalledWith('user-1', 'all');
    });

    it('throws NotificationNotFoundError when ids is an empty array', async () => {
        await expect(markNotiUc('user-1', [])).rejects.toThrow(NotificationNotFoundError);
    });

    it('throws NotificationNotFoundError when ids is not an array and not "all"', async () => {
        await expect(markNotiUc('user-1', null)).rejects.toThrow(NotificationNotFoundError);
        await expect(markNotiUc('user-1', 123)).rejects.toThrow(NotificationNotFoundError);
    });

    it('busts the notifications list cache on success', async () => {
        notificationRepo.markRead.mockResolvedValue(1);
        redisDel.mockResolvedValue(undefined);
        redisDelPattern.mockResolvedValue(undefined);

        await markNotiUc('user-1', ['noti-1']);
        expect(redisDelPattern).toHaveBeenCalledWith(expect.stringContaining('user-1'));
    });

    it('busts the unread count cache on success', async () => {
        notificationRepo.markRead.mockResolvedValue(1);
        redisDel.mockResolvedValue(undefined);
        redisDelPattern.mockResolvedValue(undefined);

        await markNotiUc('user-1', ['noti-1']);
        expect(redisDel).toHaveBeenCalledWith(expect.stringContaining('user-1'));
    });

    it('does NOT call repo when ids validation fails', async () => {
        await expect(markNotiUc('user-1', [])).rejects.toThrow();
        expect(notificationRepo.markRead).not.toHaveBeenCalled();
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. notifyTestResultUseCase
// ═════════════════════════════════════════════════════════════════════════════
describe('notifyTestResultUseCase', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.FRONTEND_URL = 'https://app.example.com';
        notificationRepo.create.mockResolvedValue(makeSavedNotification({ type: 'TEST_RESULT' }));
        getIO.mockReturnValue(null);
    });

    it('sends a TEST_RESULT notification', async () => {
        await notifyTestResultUseCase('user-1', { testName: 'IELTS', score: 7.5, breakdown: {} });
        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.type).toBe('TEST_RESULT');
    });

    it('includes score and testName in the message', async () => {
        await notifyTestResultUseCase('user-1', { testName: 'IELTS', score: 7.5, breakdown: {} });
        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.message).toContain('IELTS');
        expect(entityArg.message).toContain('7.5');
    });

    it('stores score and breakdown in metadata', async () => {
        const breakdown = { reading: 8, writing: 7 };
        await notifyTestResultUseCase('user-1', { testName: 'IELTS', score: 7.5, breakdown });
        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.metadata).toMatchObject({ score: 7.5, breakdown });
    });

    it('sets the ctaUrl to the results page', async () => {
        await notifyTestResultUseCase('user-1', { testName: 'IELTS', score: 7.5, breakdown: {} });
        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.metadata.ctaUrl).toBe('https://app.example.com/results');
    });

    it('returns the saved notification', async () => {
        const saved = makeSavedNotification({ type: 'TEST_RESULT' });
        notificationRepo.create.mockResolvedValue(saved);
        const result = await notifyTestResultUseCase('user-1', { testName: 'IELTS', score: 8, breakdown: {} });
        expect(result).toBe(saved);
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. notifyExamReminderUseCase
// ═════════════════════════════════════════════════════════════════════════════
describe('notifyExamReminderUseCase', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.FRONTEND_URL = 'https://app.example.com';
        notificationRepo.create.mockResolvedValue(makeSavedNotification({ type: 'EXAM_REMINDER' }));
        getIO.mockReturnValue(null);
    });

    it('sends an EXAM_REMINDER notification', async () => {
        await notifyExamReminderUseCase('user-1', { examName: 'IELTS Academic', examDate: '2025-08-15T08:00:00Z', location: 'Bangkok' });
        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.type).toBe('EXAM_REMINDER');
    });

    it('includes examName in the notification title', async () => {
        await notifyExamReminderUseCase('user-1', { examName: 'IELTS Academic', examDate: '2025-08-15T08:00:00Z' });
        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.title).toContain('IELTS Academic');
    });

    it('formats the exam date in the message body', async () => {
        await notifyExamReminderUseCase('user-1', { examName: 'IELTS Academic', examDate: '2025-08-15T08:00:00Z' });
        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.message).toContain('2025');
    });

    it('appends location to the message when provided', async () => {
        await notifyExamReminderUseCase('user-1', { examName: 'IELTS Academic', examDate: '2025-08-15T08:00:00Z', location: 'Bangkok Center' });
        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.message).toContain('Bangkok Center');
    });

    it('does NOT mention "Location:" when location is omitted', async () => {
        await notifyExamReminderUseCase('user-1', { examName: 'IELTS Academic', examDate: '2025-08-15T08:00:00Z' });
        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.message).not.toContain('Location:');
    });

    it('stores examName, examDate, and location in metadata', async () => {
        await notifyExamReminderUseCase('user-1', { examName: 'IELTS Academic', examDate: '2025-08-15T08:00:00Z', location: 'Bangkok Center' });
        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.metadata).toMatchObject({ examName: 'IELTS Academic', examDate: '2025-08-15T08:00:00Z', location: 'Bangkok Center' });
    });

    it('sets the ctaUrl to the exams page', async () => {
        await notifyExamReminderUseCase('user-1', { examName: 'IELTS Academic', examDate: '2025-08-15T08:00:00Z' });
        const entityArg = notificationRepo.create.mock.calls[0][0];
        expect(entityArg.metadata.ctaUrl).toBe('https://app.example.com/exams');
    });
});