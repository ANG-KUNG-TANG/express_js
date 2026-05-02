import mongoose from 'mongoose';
// ❌ removed MongoMemoryServer import
import AuditLogModel from '../../infrastructure/models/audit_log_model.js';

beforeAll(async () => {
  await mongoose.connect(process.env.__MONGO_URI__ + 'audit-log-model-test');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await AuditLogModel.deleteMany({});
});

describe('AuditLog Model', () => {
  const validLog = {
    action: 'user.login',
    outcome: 'success',
    requesterId: new mongoose.Types.ObjectId(),
    details: { provider: 'google' },
    request: {
      method: 'POST',
      path: '/api/auth/login',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      requestId: 'req-123',
    },
  };

  test('should create and save an audit log successfully', async () => {
    const log = new AuditLogModel(validLog);
    const saved = await log.save();
    expect(saved._id).toBeDefined();
    expect(saved.action).toBe(validLog.action);
    expect(saved.outcome).toBe(validLog.outcome);
    expect(saved.requesterId).toEqual(validLog.requesterId);
    expect(saved.details).toEqual(validLog.details);
    expect(saved.request.method).toBe(validLog.request.method);
    expect(saved.createdAt).toBeDefined();
  });

  test('should fail when action is missing', async () => {
    const data = { ...validLog, action: undefined };
    const log = new AuditLogModel(data);
    await expect(log.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should default outcome to "success" if not provided', async () => {
    const data = { ...validLog, outcome: undefined };
    const log = new AuditLogModel(data);
    const saved = await log.save();
    expect(saved.outcome).toBe('success');
  });

  test('should reject invalid outcome', async () => {
    const data = { ...validLog, outcome: 'pending' };
    const log = new AuditLogModel(data);
    await expect(log.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should default request to null when omitted', async () => {
    const data = { ...validLog, request: undefined };
    const log = new AuditLogModel(data);
    const saved = await log.save();
    expect(saved.request).toBeNull();
  });

  test('should accept partial request fields', async () => {
    const data = {
      ...validLog,
      request: { ip: '10.0.0.1' },
    };
    const log = new AuditLogModel(data);
    const saved = await log.save();
    expect(saved.request.ip).toBe('10.0.0.1');
    expect(saved.request.method).toBeNull();
  });
});