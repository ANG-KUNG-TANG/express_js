import mongoose from 'mongoose';
// ❌ removed MongoMemoryServer import
import ContentFlagModel from '../../infrastructure/models/content_flag_model.js';

beforeAll(async () => {
  await mongoose.connect(process.env.__MONGO_URI__ + 'content-flag-model-test');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await ContentFlagModel.deleteMany({});
});

describe('ContentFlag Model', () => {
  const validFlag = {
    taskId: new mongoose.Types.ObjectId(),
    taskTitle: 'My Essay',
    flaggedBy: new mongoose.Types.ObjectId(),
    reason: 'Inappropriate content',
    severity: 'high',
    status: 'open',
  };

  test('should create and save a content flag successfully', async () => {
    const flag = new ContentFlagModel(validFlag);
    const saved = await flag.save();
    expect(saved._id).toBeDefined();
    expect(saved.taskId).toEqual(validFlag.taskId);
    expect(saved.flaggedBy).toEqual(validFlag.flaggedBy);
    expect(saved.reason).toBe(validFlag.reason);
    expect(saved.severity).toBe(validFlag.severity);
    expect(saved.status).toBe(validFlag.status);
    expect(saved.createdAt).toBeDefined();
    expect(saved.updatedAt).toBeDefined();
  });

  test('should fail when taskId is missing', async () => {
    const data = { ...validFlag, taskId: undefined };
    const flag = new ContentFlagModel(data);
    await expect(flag.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should fail when flaggedBy is missing', async () => {
    const data = { ...validFlag, flaggedBy: undefined };
    const flag = new ContentFlagModel(data);
    await expect(flag.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should fail when reason is missing', async () => {
    const data = { ...validFlag, reason: undefined };
    const flag = new ContentFlagModel(data);
    await expect(flag.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should default severity to "medium" and status to "open"', async () => {
    const data = {
      taskId: validFlag.taskId,
      flaggedBy: validFlag.flaggedBy,
      reason: validFlag.reason,
    };
    const flag = new ContentFlagModel(data);
    const saved = await flag.save();
    expect(saved.severity).toBe('medium');
    expect(saved.status).toBe('open');
  });

  test('should reject invalid severity', async () => {
    const data = { ...validFlag, severity: 'critical' };
    const flag = new ContentFlagModel(data);
    await expect(flag.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should reject invalid status', async () => {
    const data = { ...validFlag, status: 'closed' };
    const flag = new ContentFlagModel(data);
    await expect(flag.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should allow null resolvedBy and resolvedAt', async () => {
    const saved = await new ContentFlagModel(validFlag).save();
    expect(saved.resolvedBy).toBeNull();
    expect(saved.resolvedAt).toBeNull();
  });
});