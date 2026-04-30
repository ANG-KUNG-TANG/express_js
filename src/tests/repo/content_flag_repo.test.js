// src/tests/repo/content_flag_repo.test.js
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ContentFlagModel from '../../infrastructure/models/content_flag_model.js';
import UserModel from '../../infrastructure/models/user_model.js';
import * as contentFlagRepo from '../../infrastructure/repositories/content_flag_repo.js';
import { FlagSeverity, FlagStatus } from '../../domain/entities/content_flag_entity.js';
import { UserRole } from '../../domain/base/user_enums.js';

describe('Content Flag Repository', () => {
  let mongoServer;
  let adminUser, taskId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
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

  const validFlagData = {
    taskId,
    flaggedBy: adminUser._id.toString(),
    reason: 'Inappropriate content',
    severity: FlagSeverity.HIGH,
  };

  describe('createFlag', () => {
    it('should create a new flag', async () => {
      const flag = await contentFlagRepo.createFlag(validFlagData);
      expect(flag).toBeDefined();
      expect(flag.reason).toBe(validFlagData.reason);
      expect(flag.status).toBe(FlagStatus.OPEN);
    });

    it('should throw validation error for missing reason', async () => {
      await expect(
        contentFlagRepo.createFlag({ ...validFlagData, reason: '' })
      ).rejects.toThrow('reason is required');
    });

    it('should throw invalid task id error', async () => {
      await expect(
        contentFlagRepo.createFlag({ ...validFlagData, taskId: 'invalid' })
      ).rejects.toThrow('invalid taskId');
    });
  });

  describe('findFlagById', () => {
    it('should find a flag by id', async () => {
      const created = await contentFlagRepo.createFlag(validFlagData);
      const found = await contentFlagRepo.findFlagById(created.id);
      expect(found.id).toBe(created.id);
    });

    it('should throw not found', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(contentFlagRepo.findFlagById(fakeId)).rejects.toThrow('Content flag not found');
    });
  });

  describe('resolveFlag', () => {
    it('should mark flag as resolved', async () => {
      const flag = await contentFlagRepo.createFlag(validFlagData);
      const resolved = await contentFlagRepo.resolveFlag(flag.id, adminUser._id.toString());
      expect(resolved.status).toBe(FlagStatus.RESOLVED);
      expect(resolved.resolvedBy).toBe(adminUser._id.toString());
    });

    it('should throw if already resolved', async () => {
      const flag = await contentFlagRepo.createFlag(validFlagData);
      await contentFlagRepo.resolveFlag(flag.id, adminUser._id.toString());
      await expect(
        contentFlagRepo.resolveFlag(flag.id, adminUser._id.toString())
      ).rejects.toThrow('already resolved');
    });
  });

  describe('deleteFlag', () => {
    it('should delete a flag', async () => {
      const flag = await contentFlagRepo.createFlag(validFlagData);
      const deleted = await contentFlagRepo.deleteFlag(flag.id);
      expect(deleted.id).toBe(flag.id);
      await expect(contentFlagRepo.findFlagById(flag.id)).rejects.toThrow();
    });
  });

  describe('findFlags', () => {
    it('should list flags with filters', async () => {
      await contentFlagRepo.createFlag(validFlagData);
      await contentFlagRepo.createFlag({ ...validFlagData, severity: FlagSeverity.LOW });
      const result = await contentFlagRepo.findFlags({ severity: FlagSeverity.HIGH });
      expect(result.flags).toHaveLength(1);
    });
  });

  describe('countFlagsByStatus', () => {
    it('should return counts', async () => {
      await contentFlagRepo.createFlag(validFlagData);
      const counts = await contentFlagRepo.countFlagsByStatus();
      expect(counts[FlagStatus.OPEN]).toBe(1);
    });
  });
});