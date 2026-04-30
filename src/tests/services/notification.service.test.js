// src/tests/services/notification.service.test.js

import { jest } from '@jest/globals';

// ── ESM mocks: unstable_mockModule BEFORE the dynamic import of the module under test ──

const mockSendNotificationUseCase = jest.fn();
const mockRedisDel                = jest.fn();

jest.unstable_mockModule('../../../src/app/notification/send_noti.uc.js', () => ({
    sendNotificationUseCase: mockSendNotificationUseCase,
}));

jest.unstable_mockModule('../../../src/core/services/redis.service.js', () => ({
    redisDel:  mockRedisDel,
    CacheKeys: {
        userNotifications: (uid) => `notifications:${uid}`,
        unreadCount:       (uid) => `notifications:${uid}:unread`,
    },
}));

jest.unstable_mockModule('../../../src/domain/base/noti_enums.js', () => ({
    NotificationType: {
        TASK_ASSIGNED:  'task.assigned',
        TASK_REVIEWED:  'task.reviewed',
        SYSTEM_MESSAGE: 'system.message',
    },
}));

// Dynamic import AFTER all mocks are registered
const { NotificationService } = await import('../../../src/core/services/notification.service.js');

describe('NotificationService', () => {
    const recipientId = 'user-student-01';
    const actorId     = 'user-teacher-01';
    const fakeNoti    = { _id: 'noti-001', type: 'task.assigned' };

    beforeEach(() => { jest.clearAllMocks(); });

    describe('TYPES', () => {
        it('exposes NotificationType constants', () => {
            expect(NotificationService.TYPES.TASK_ASSIGNED).toBe('task.assigned');
            expect(NotificationService.TYPES.TASK_REVIEWED).toBe('task.reviewed');
        });
    });

    describe('send', () => {
        it('calls sendNotificationUseCase with the correct payload', async () => {
            mockSendNotificationUseCase.mockResolvedValueOnce(fakeNoti);
            mockRedisDel.mockResolvedValueOnce(undefined);

            await NotificationService.send({
                recipientId, actorId,
                type: 'task.assigned', title: 'New task',
                message: 'A task was assigned to you',
                refId: 'task-001', refModel: 'Task',
            });

            expect(mockSendNotificationUseCase).toHaveBeenCalledWith({
                userId:  recipientId,
                type:    'task.assigned',
                title:   'New task',
                message: 'A task was assigned to you',
                metadata: { actorId, refId: 'task-001', refModel: 'Task' },
            });
        });

        it('busts both Redis cache keys for the recipient', async () => {
            mockSendNotificationUseCase.mockResolvedValueOnce(fakeNoti);
            mockRedisDel.mockResolvedValueOnce(undefined);

            await NotificationService.send({
                recipientId, type: 'task.assigned', title: 'T', message: 'M',
            });

            expect(mockRedisDel).toHaveBeenCalledWith(
                `notifications:${recipientId}`,
                `notifications:${recipientId}:unread`,
            );
        });

        it('returns the notification from sendNotificationUseCase', async () => {
            mockSendNotificationUseCase.mockResolvedValueOnce(fakeNoti);
            mockRedisDel.mockResolvedValueOnce(undefined);

            const result = await NotificationService.send({
                recipientId, type: 'task.assigned', title: 'T', message: 'M',
            });
            expect(result).toEqual(fakeNoti);
        });

        it('defaults optional fields (actorId, refId, refModel) to null', async () => {
            mockSendNotificationUseCase.mockResolvedValueOnce(fakeNoti);
            mockRedisDel.mockResolvedValueOnce(undefined);

            await NotificationService.send({
                recipientId, type: 'task.assigned', title: 'T', message: 'M',
            });

            expect(mockSendNotificationUseCase).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: { actorId: null, refId: null, refModel: null },
                })
            );
        });

        it('returns null and does NOT throw when sendNotificationUseCase fails', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            mockSendNotificationUseCase.mockRejectedValueOnce(new Error('DB error'));

            const result = await NotificationService.send({
                recipientId, type: 'task.assigned', title: 'T', message: 'M',
            });

            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('returns null and does NOT throw when redisDel fails', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            mockSendNotificationUseCase.mockResolvedValueOnce(fakeNoti);
            mockRedisDel.mockRejectedValueOnce(new Error('Redis error'));

            const result = await NotificationService.send({
                recipientId, type: 'task.assigned', title: 'T', message: 'M',
            });

            expect(result).toBeNull();
            consoleSpy.mockRestore();
        });
    });

    describe('sendToMany', () => {
        const options = { type: 'task.assigned', title: 'Task!', message: 'New task' };

        beforeEach(() => {
            mockSendNotificationUseCase.mockResolvedValue(fakeNoti);
            mockRedisDel.mockResolvedValue(undefined);
        });

        it('sends a notification to each recipient', async () => {
            await NotificationService.sendToMany(['u1', 'u2', 'u3'], options);
            expect(mockSendNotificationUseCase).toHaveBeenCalledTimes(3);
        });

        it('passes the correct recipientId for each user', async () => {
            await NotificationService.sendToMany(['u-a', 'u-b'], options);
            const userIds = mockSendNotificationUseCase.mock.calls.map((c) => c[0].userId);
            expect(userIds).toContain('u-a');
            expect(userIds).toContain('u-b');
        });

        it('does nothing when recipientIds is empty', async () => {
            await NotificationService.sendToMany([], options);
            expect(mockSendNotificationUseCase).not.toHaveBeenCalled();
        });

        it('does nothing when recipientIds is null', async () => {
            await NotificationService.sendToMany(null, options);
            expect(mockSendNotificationUseCase).not.toHaveBeenCalled();
        });

        it('settles all promises even if some fail', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            mockSendNotificationUseCase
                .mockRejectedValueOnce(new Error('fail u1'))
                .mockResolvedValueOnce(fakeNoti);

            await expect(
                NotificationService.sendToMany(['u1', 'u2'], options)
            ).resolves.not.toThrow();
            consoleSpy.mockRestore();
        });
    });
});