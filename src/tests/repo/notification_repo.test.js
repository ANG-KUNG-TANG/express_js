// src/tests/repo/notification_repo.test.js
import mongoose from 'mongoose';
import { Notification as NotificationModel } from '../../infrastructure/models/notification_model.js';
import { Notification, NotificationType } from '../../domain/entities/notificaiton_entity.js'; // FIX: also import NotificationType
import { notificationRepo } from '../../infrastructure/repositories/notification_repo.js';
import UserModel from '../../infrastructure/models/user_model.js';
import { UserRole } from '../../domain/base/user_enums.js';

describe('Notification Repository', () => {
  let userId;

  beforeAll(async () => {
    await mongoose.connect(process.env.__MONGO_URI__ + 'notification-test');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await NotificationModel.deleteMany({});
    await UserModel.deleteMany({});
    const user = await UserModel.create({
      name: 'Test',
      email: 'test@test.com',
      password: 'password123',
      role: UserRole.USER,
    });
    userId = user._id.toString();
  });

  const makeNotification = (overrides = {}) =>
    new Notification({
      userId,
      // FIX: use the enum value instead of a raw string literal.
      // The entity validates against Object.values(NotificationType), and
      // 'TASK_ASSIGNED' is not a registered value — the enum key is TASK_ASSIGNED
      // but its value may differ (e.g. 'task_assigned'). Using the enum reference
      // guarantees we always pass the correct runtime value regardless of its spelling.
      type: NotificationType.TASK_ASSIGNED,
      title: 'Test',
      message: 'test message',
      isRead: false,
      metadata: {},
      ...overrides,
    });

  // ── create ─────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('should store a notification', async () => {
      const saved = await notificationRepo.create(makeNotification());
      expect(saved).toBeDefined();
      expect(saved.userId).toBe(userId);
    });
  });

  // ── findByUserId ───────────────────────────────────────────────────────────
  describe('findByUserId', () => {
    it('should retrieve notifications for a user', async () => {
      await notificationRepo.create(makeNotification());
      const result = await notificationRepo.findByUserId(userId);
      expect(result.notifications).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  // ── countUnread ────────────────────────────────────────────────────────────
  describe('countUnread', () => {
    it('should count only unread notifications', async () => {
      await notificationRepo.create(makeNotification({ isRead: false }));
      await notificationRepo.create(makeNotification({ isRead: true }));
      const count = await notificationRepo.countUnread(userId);
      expect(count).toBe(1);
    });
  });

  // ── markRead ───────────────────────────────────────────────────────────────
  describe('markRead', () => {
    it('should mark notifications as read', async () => {
      const n = await notificationRepo.create(makeNotification());
      await notificationRepo.markRead(userId, [n.id]);
      const result = await notificationRepo.findByUserId(userId);
      expect(result.notifications[0].isRead).toBe(true);
    });
  });

  // ── deleteOne ──────────────────────────────────────────────────────────────
  describe('deleteOne', () => {
    it('should delete a notification', async () => {
      const n = await notificationRepo.create(makeNotification());
      const success = await notificationRepo.deleteOne(userId, n.id);
      expect(success).toBe(true);
      const result = await notificationRepo.findByUserId(userId);
      expect(result.notifications).toHaveLength(0);
    });
  });
});