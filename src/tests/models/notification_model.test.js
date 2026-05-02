import mongoose from 'mongoose';
// ❌ removed MongoMemoryServer import
import { Notification } from '../../infrastructure/models/notification_model.js';  // adjust if path is correct

beforeAll(async () => {
  await mongoose.connect(process.env.__MONGO_URI__ + 'notification-model-test');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Notification.deleteMany({});
});

describe('Notification Model', () => {
  const validNotification = {
    userId: new mongoose.Types.ObjectId(),
    type: 'task_assigned',
    title: 'New task assigned',
    message: 'You have been assigned Task #42.',
    metadata: { taskId: new mongoose.Types.ObjectId(), teacherId: new mongoose.Types.ObjectId() },
    isRead: false,
  };

  test('should create and save a notification successfully', async () => {
    const notification = new Notification(validNotification);
    const saved = await notification.save();
    expect(saved._id).toBeDefined();
    expect(saved.userId).toEqual(validNotification.userId);
    expect(saved.type).toBe(validNotification.type);
    expect(saved.title).toBe(validNotification.title);
    expect(saved.message).toBe(validNotification.message);
    expect(saved.metadata).toEqual(validNotification.metadata);
    expect(saved.isRead).toBe(false);
    expect(saved.createdAt).toBeDefined();
    expect(saved.updatedAt).toBeDefined();
  });

  test('should fail when userId is missing', async () => {
    const data = { ...validNotification, userId: undefined };
    const notification = new Notification(data);
    await expect(notification.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should fail when type is missing', async () => {
    const data = { ...validNotification, type: undefined };
    const notification = new Notification(data);
    await expect(notification.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should fail when title is missing', async () => {
    const data = { ...validNotification, title: undefined };
    const notification = new Notification(data);
    await expect(notification.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should fail when message is missing', async () => {
    const data = { ...validNotification, message: undefined };
    const notification = new Notification(data);
    await expect(notification.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should default isRead to false', async () => {
    const data = { ...validNotification, isRead: undefined };
    const notification = new Notification(data);
    const saved = await notification.save();
    expect(saved.isRead).toBe(false);
  });

  test('should allow null metadata', async () => {
    const data = { ...validNotification, metadata: null };
    const notification = new Notification(data);
    const saved = await notification.save();
    expect(saved.metadata).toBeNull();
  });

  test('should enforce maxlength on title (120) and message (400)', async () => {
    const longTitle = 'a'.repeat(121);
    const data = { ...validNotification, title: longTitle };
    const notification = new Notification(data);
    await expect(notification.save()).rejects.toThrow(mongoose.Error.ValidationError);

    const longMsg = 'b'.repeat(401);
    const data2 = { ...validNotification, message: longMsg };
    const note = new Notification(data2);
    await expect(note.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });
});