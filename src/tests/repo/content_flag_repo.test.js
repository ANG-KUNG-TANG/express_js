// src/tests/repo/content_flag_repo.test.js
import mongoose from 'mongoose';
import ContentFlagModel from '../../infrastructure/models/content_flag_model.js';
import UserModel from '../../infrastructure/models/user_model.js';
import * as contentFlagRepo from '../../infrastructure/repositories/content_flag_repo.js';
import { FlagSeverity, FlagStatus } from '../../domain/entities/content_flag_entity.js';
import { UserRole } from '../../domain/base/user_enums.js';

describe('Content Flag Repository', () => {
  let adminUser, taskId;

  beforeAll(async () => {
    await mongoose.connect(process.env.__MONGO_URI__ + 'content-flag-test');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await ContentFlagModel.deleteMany({});
    await UserModel.deleteMany({});
    adminUser = await UserModel.create({
      name: 'Admin',
      email: 'admin@test.com',
      password: 'hashedpassword',
      role: UserRole.ADMIN,
    });
    taskId = new mongoose.Types.ObjectId().toString();
  });

  // Factory called at test-time so adminUser is always defined
  const getValidFlagData = () => ({
    taskId,
    flaggedBy: adminUser._id.toString(),
    reason: 'Inappropriate content',
    severity: FlagSeverity.HIGH,
  });

  // ── createFlag ─────────────────────────────────────────────────────────────
  describe('createFlag', () => {
    it('should create a new flag', async () => {
      const flag = await contentFlagRepo.createFlag(getValidFlagData());
      expect(flag).toBeDefined();
      expect(flag.reason).toBe('Inappropriate content');
      expect(flag.status).toBe(FlagStatus.OPEN);
    });

    it('should throw for missing reason', async () => {
      await expect(contentFlagRepo.createFlag({ ...getValidFlagData(), reason: '' }))
        .rejects.toThrow('reason is required');
    });

    it('should throw for invalid taskId', async () => {
      await expect(contentFlagRepo.createFlag({ ...getValidFlagData(), taskId: 'invalid' }))
        // FIX: actual error message is "Invalid task id for flagging: <id>"
        // not the literal string "invalid taskId"
        .rejects.toThrow('Invalid task id for flagging');
    });
  });

  // ── findFlagById ───────────────────────────────────────────────────────────
  describe('findFlagById', () => {
    it('should find a flag by id', async () => {
      const created = await contentFlagRepo.createFlag(getValidFlagData());
      const found = await contentFlagRepo.findFlagById(created.id);
      expect(found.id).toBe(created.id);
    });

    it('should throw not found for unknown id', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(contentFlagRepo.findFlagById(fakeId)).rejects.toThrow('Content flag not found');
    });
  });

  // ── resolveFlag ────────────────────────────────────────────────────────────
  describe('resolveFlag', () => {
    it('should mark a flag as resolved', async () => {
      const flag = await contentFlagRepo.createFlag(getValidFlagData());
      const resolved = await contentFlagRepo.resolveFlag(flag.id, adminUser._id.toString());
      expect(resolved.status).toBe(FlagStatus.RESOLVED);
      expect(resolved.resolvedBy).toBe(adminUser._id.toString());
    });

    it('should throw if already resolved', async () => {
      const flag = await contentFlagRepo.createFlag(getValidFlagData());
      await contentFlagRepo.resolveFlag(flag.id, adminUser._id.toString());
      await expect(contentFlagRepo.resolveFlag(flag.id, adminUser._id.toString()))
        .rejects.toThrow('already resolved');
    });
  });

  // ── deleteFlag ─────────────────────────────────────────────────────────────
  describe('deleteFlag', () => {
    it('should delete a flag', async () => {
      const flag = await contentFlagRepo.createFlag(getValidFlagData());
      const deleted = await contentFlagRepo.deleteFlag(flag.id);
      expect(deleted.id).toBe(flag.id);
      await expect(contentFlagRepo.findFlagById(flag.id)).rejects.toThrow();
    });
  });

  // ── findFlags ──────────────────────────────────────────────────────────────
  describe('findFlags', () => {
    it('should list flags filtered by severity', async () => {
      await contentFlagRepo.createFlag(getValidFlagData());
      await contentFlagRepo.createFlag({ ...getValidFlagData(), severity: FlagSeverity.LOW });
      const result = await contentFlagRepo.findFlags({ severity: FlagSeverity.HIGH });
      expect(result.flags).toHaveLength(1);
    });
  });

  // ── countFlagsByStatus ─────────────────────────────────────────────────────
  describe('countFlagsByStatus', () => {
    it('should return counts per status', async () => {
      await contentFlagRepo.createFlag(getValidFlagData());
      const counts = await contentFlagRepo.countFlagsByStatus();
      expect(counts[FlagStatus.OPEN]).toBe(1);
    });
  });
});