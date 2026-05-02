// src/tests/repo/password_rest_repo.test.js
import mongoose from 'mongoose';
import { PasswordResetTokenModel } from '../../infrastructure/models/password_reset_token_model.js';
import { passwordResetTokenRepo } from '../../infrastructure/repositories/password_reset_token_repo.js';
import { PasswordResetToken } from '../../domain/entities/password_reset_token_entity.js';

describe('Password Reset Token Repository', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.__MONGO_URI__ + 'password-reset-repo-test');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await PasswordResetTokenModel.deleteMany({});
  });

  // Unique ids & hashes per call so tests never collide
  let counter = 0;
  const makeToken = (overrides = {}) => {
    counter++;
    return new PasswordResetToken({
      id:        `token-${counter}`,
      userId:    'user-abc',
      tokenHash: `hash-${counter}`,
      expiresAt: new Date(Date.now() + 3_600_000),
      used:      false,
      ...overrides,
    });
  };

  // ── create ─────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('should persist a token and return an entity', async () => {
      const entity = makeToken();
      const saved = await passwordResetTokenRepo.create(entity);
      expect(saved).toBeDefined();
      expect(saved.userId).toBe(entity.userId);
      expect(saved.tokenHash).toBe(entity.tokenHash);
      expect(saved.used).toBe(false);
    });
  });

  // ── findByHash ─────────────────────────────────────────────────────────────
  describe('findByHash', () => {
    it('should find a token by its hash', async () => {
      const entity = makeToken();
      await passwordResetTokenRepo.create(entity);
      const found = await passwordResetTokenRepo.findByHash(entity.tokenHash);
      expect(found).toBeDefined();
      expect(found.tokenHash).toBe(entity.tokenHash);
      expect(found.userId).toBe(entity.userId);
    });

    it('should return null for an unknown hash', async () => {
      const found = await passwordResetTokenRepo.findByHash('no-such-hash');
      expect(found).toBeNull();
    });
  });

  // ── save (mark used) ───────────────────────────────────────────────────────
  describe('save', () => {
    it('should update the used field to true', async () => {
      const entity = makeToken();
      await passwordResetTokenRepo.create(entity);

      // FIX: PasswordResetToken exposes `used` as a read-only getter (no setter),
      // so `entity.used = true` throws a TypeError at runtime.
      // Instead, construct a new entity with the same identity fields but used: true.
      // This is consistent with the immutable-entity pattern the domain layer enforces.
      const markedUsed = new PasswordResetToken({
        id:        entity.id,
        userId:    entity.userId,
        tokenHash: entity.tokenHash,
        expiresAt: entity.expiresAt,
        used:      true,
      });
      await passwordResetTokenRepo.save(markedUsed);

      const found = await passwordResetTokenRepo.findByHash(entity.tokenHash);
      expect(found.used).toBe(true);
    });
  });

  // ── invalidateAllForUser ───────────────────────────────────────────────────
  describe('invalidateAllForUser', () => {
    it('should mark every unused token for a user as used', async () => {
      const userId = 'user-xyz';
      const t1 = makeToken({ userId });
      const t2 = makeToken({ userId });
      await passwordResetTokenRepo.create(t1);
      await passwordResetTokenRepo.create(t2);

      await passwordResetTokenRepo.invalidateAllForUser(userId);

      const found1 = await passwordResetTokenRepo.findByHash(t1.tokenHash);
      const found2 = await passwordResetTokenRepo.findByHash(t2.tokenHash);
      expect(found1.used).toBe(true);
      expect(found2.used).toBe(true);
    });

    it('should not affect tokens belonging to other users', async () => {
      const targetUser = 'user-target';
      const otherUser  = 'user-other';
      const tokenTarget = makeToken({ userId: targetUser });
      const tokenOther  = makeToken({ userId: otherUser });
      await passwordResetTokenRepo.create(tokenTarget);
      await passwordResetTokenRepo.create(tokenOther);

      await passwordResetTokenRepo.invalidateAllForUser(targetUser);

      const other = await passwordResetTokenRepo.findByHash(tokenOther.tokenHash);
      expect(other.used).toBe(false);
    });
  });
});