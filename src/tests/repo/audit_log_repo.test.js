// src/tests/repo/audit_log_repo.test.js
import { jest } from '@jest/globals';           // FIX 1: jest is not a global in ESM mode
import mongoose from 'mongoose';
import AuditLogModel from '../../infrastructure/models/audit_log_model.js';
import UserModel from '../../infrastructure/models/user_model.js'; // FIX 2: registers the User schema so populate() inside findLogs() doesn't throw MissingSchemaError
import * as auditLogRepo from '../../infrastructure/repositories/audit_log_repo.js';

describe('Audit Log Repository', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.__MONGO_URI__ + 'audit-log-test');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await AuditLogModel.deleteMany({});
  });

  // ── createLog ──────────────────────────────────────────────────────────────
  describe('createLog', () => {
    it('should persist an audit log entry', async () => {
      const log = await auditLogRepo.createLog({
        action: 'user.login',
        outcome: 'success',
        requesterId: new mongoose.Types.ObjectId().toString(),
      });
      expect(log).toBeDefined();
      expect(log.action).toBe('user.login');
      expect(log.outcome).toBe('success');
    });

    it('should handle a missing requesterId gracefully', async () => {
      const log = await auditLogRepo.createLog({
        action: 'user.login',
        outcome: 'success',
        requesterId: null,
      });
      expect(log).toBeDefined();
    });

    it('should not throw on DB error (returns null)', async () => {
      // FIX 1 in action: jest.spyOn works now that jest is properly imported
      jest.spyOn(AuditLogModel.prototype, 'save').mockRejectedValueOnce(new Error('DB error'));
      const log = await auditLogRepo.createLog({ action: 'x', outcome: 'y', requesterId: null });
      expect(log).toBeNull();
      jest.restoreAllMocks();
    });
  });

  // ── findLogs ───────────────────────────────────────────────────────────────
  describe('findLogs', () => {
    beforeEach(async () => {
      await auditLogRepo.createLog({ action: 'user.login',  outcome: 'success', requesterId: null });
      await auditLogRepo.createLog({ action: 'user.logout', outcome: 'success', requesterId: null });
      await auditLogRepo.createLog({ action: 'user.login',  outcome: 'failure', requesterId: null });
    });

    it('should return all logs with default pagination', async () => {
      const result = await auditLogRepo.findLogs({});
      expect(result.logs.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter by action', async () => {
      const result = await auditLogRepo.findLogs({ action: 'user.login' });
      expect(result.logs.every(l => l.action === 'user.login')).toBe(true);
    });

    it('should filter by outcome', async () => {
      const result = await auditLogRepo.findLogs({ outcome: 'failure' });
      expect(result.logs.every(l => l.outcome === 'failure')).toBe(true);
    });

    it('should respect limit', async () => {
      const result = await auditLogRepo.findLogs({ limit: 1 });
      expect(result.logs).toHaveLength(1);
    });
  });
});