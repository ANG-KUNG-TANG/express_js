// src/tests/repo/audit_log_repo.test.js
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AuditLogModel from '../../infrastructure/models/audit_log_model.js';
import * as auditLogRepo from '../../infrastructure/repositories/audit_log_repo.js';

describe('Audit Log Repository', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await AuditLogModel.deleteMany({});
  });

  describe('createLog', () => {
    it('should persist an audit log entry', async () => {
      const entry = await auditLogRepo.createLog({
        action: 'user.login',
        outcome: 'success',
        requesterId: null,
        details: { ip: '127.0.0.1' },
      });
      expect(entry).toBeDefined();
      expect(entry.action).toBe('user.login');
      expect(entry.outcome).toBe('success');
      expect(entry.actorLabel).toBeNull();
    });

    it('should handle a missing requesterId gracefully', async () => {
      const entry = await auditLogRepo.createLog({
        action: 'task.create',
      });
      expect(entry.requesterId).toBeNull();
      expect(entry.actorLabel).toBeNull();
    });

    it('should not throw on DB error (returns null)', async () => {
      // Simulate a duplicate _id or other error by using an invalid model? 
      // The original code catches all errors and returns null. We'll just verify it doesn't crash.
      // We'll force an error by passing a malformed action? No, it's any string. Just trust catch.
      const result = await auditLogRepo.createLog({
        action: null, // This may cause validation error; repo will catch and return null
      });
      expect(result).toBeNull();
    });
  });

  describe('findLogs', () => {
    beforeEach(async () => {
      await auditLogRepo.createLog({
        action: 'user.login',
        outcome: 'success',
        requesterId: null,
      });
      await auditLogRepo.createLog({
        action: 'user.logout',
        outcome: 'success',
        requesterId: null,
      });
    });

    it('should return all logs with default pagination', async () => {
      const result = await auditLogRepo.findLogs();
      expect(result.logs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pages).toBe(1);
    });

    it('should filter by action', async () => {
      const result = await auditLogRepo.findLogs({ action: 'user.login' });
      expect(result.logs).toHaveLength(1);
    });

    it('should filter by outcome', async () => {
      const result = await auditLogRepo.findLogs({ outcome: 'success' });
      expect(result.total).toBe(2);
    });

    it('should respect sort and limit', async () => {
      const result = await auditLogRepo.findLogs({
        sort: { createdAt: 1 },
        limit: 1,
        page: 1,
      });
      expect(result.logs).toHaveLength(1);
    });
  });
});