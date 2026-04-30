// src/tests/repo/notification_repo.test.js
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Notification as NotificationModel } from '../../infrastructure/models/notification_model.js';
import { Notification } from '../../domain/entities/notificaiton_entity.js';
import { notificationRepo } from '../../infrastructure/repositories/notification_repo.js';
import { UserRole } from '../../domain/base/user_enums.js';
import UserModel from '../../infrastructure/models/user_model.js';

describe('Notification Repository', () => {
  let mongoServer;
  let userId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await NotificationModel.deleteMany({});
    await UserModel.deleteMany({});
    const user = await UserModel.create({
      name: 'Test',
      email: 'test@test.com',
      password: 'pass',
      role: UserRole.USER,
    });
    userId = user._id.toString();
  });

  const createEntity = (overrides = {}) =>
    new Notification({
      userId,
      type: 'TASK_ASSIGNED',
      title: 'Test',
      message: 'test message',
      isRead: false,
      metadata: {},
      ...overrides,
    });

  describe('create', () => {
    it('should store a notification', async () => {
      const entity = createEntity();
      const saved = await notificationRepo.create(entity);
      expect(saved).toBeDefined();
      expect(saved.userId).toBe(userId);
    });
  });

  describe('findByUserId', () => {
    it('should retrieve notifications for user', async () => {
      await notificationRepo.create(createEntity());
      const result = await notificationRepo.findByUserId(userId);
      expect(result.notifications).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('countUnread', () => {
    it('should count only unread', async () => {
      await notificationRepo.create(createEntity({ isRead: false }));
      await notificationRepo.create(createEntity({ isRead: true }));
      const count = await notificationRepo.countUnread(userId);
      expect(count).toBe(1);
    });
  });

  describe('markRead', () => {
    it('should mark notifications as read', async () => {
      const n1 = await notificationRepo.create(createEntity());
      await notificationRepo.markRead(userId, [n1.id]);
      const result = await notificationRepo.findByUserId(userId);
      expect(result.notifications[0].isRead).toBe(true);
    });
  });

  describe('deleteOne', () => {
    it('should delete a notification', async () => {
      const n1 = await notificationRepo.create(createEntity());
      const success = await notificationRepo.deleteOne(userId, n1.id);
      expect(success).toBe(true);
      const result = await notificationRepo.findByUserId(userId);
      expect(result.notifications).toHaveLength(0);
    });
  });
});