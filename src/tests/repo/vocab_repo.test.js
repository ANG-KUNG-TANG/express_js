// src/tests/repo/password_reset_token_repo.test.js
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { PasswordResetTokenModel } from '../../infrastructure/models/password_reset_token_model.js';
import { PasswordResetToken } from '../../domain/entities/password_reset_token_entity.js';
import { passwordResetTokenRepo } from '../../infrastructure/repositories/password_reset_token_repo.js';
import crypto from 'crypto';

describe('Password Reset Token Repository', () => {
  let mongoServer;
  const userId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await PasswordResetTokenModel.deleteMany({});
  });

  const createEntity = () =>
    new PasswordResetToken({
      id: crypto.randomBytes(32).toString('hex'),
      userId,
      tokenHash: 'hashedvalue',
      expiresAt: new Date(Date.now() + 3600000),
      used: false,
    });

  describe('create', () => {
    it('should persist a token', async () => {
      const token = createEntity();
      const saved = await passwordResetTokenRepo.create(token);
      expect(saved).toBeDefined();
      expect(saved.userId).toBe(userId);
    });
  });

  describe('findByHash', () => {
    it('should find a token by hash', async () => {
      const token = createEntity();
      await passwordResetTokenRepo.create(token);
      const found = await passwordResetTokenRepo.findByHash(token.tokenHash);
      expect(found).toBeDefined();
      expect(found.tokenHash).toBe(token.tokenHash);
    });

    it('should return null for unknown hash', async () => {
      const found = await passwordResetTokenRepo.findByHash('nohash');
      expect(found).toBeNull();
    });
  });

  describe('save / invalidateAllForUser', () => {
    it('should mark token as used', async () => {
      const token = createEntity();
      await passwordResetTokenRepo.create(token);
      token.used = true;
      await passwordResetTokenRepo.save(token);
      const updated = await passwordResetTokenRepo.findByHash(token.tokenHash);
      expect(updated.used).toBe(true);
    });

    it('should invalidate all tokens for a user', async () => {
      const token1 = createEntity();
      const token2 = createEntity();
      await passwordResetTokenRepo.create(token1);
      await passwordResetTokenRepo.create(token2);
      await passwordResetTokenRepo.invalidateAllForUser(userId);
      const found1 = await passwordResetTokenRepo.findByHash(token1.tokenHash);
      const found2 = await passwordResetTokenRepo.findByHash(token2.tokenHash);
      expect(found1.used).toBe(true);
      expect(found2.used).toBe(true);
    });
  });
});