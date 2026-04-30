import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { PasswordResetTokenModel } from '../../infrastructure/models/password_reset_token_model.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await PasswordResetTokenModel.deleteMany({});
});

describe('PasswordResetToken Model', () => {
  // IMPORTANT: schema has `_id: { type: String, default: undefined }`
  // so _id must be supplied manually.
  const validToken = {
    _id: 'test-token-1',
    userId: 'user-123',
    tokenHash: 'abc123hash',
    expiresAt: new Date(Date.now() + 3600000),
    used: false,
  };

  test('should create and save a token successfully', async () => {
    const token = new PasswordResetTokenModel(validToken);
    const saved = await token.save();
    expect(saved._id).toBe('test-token-1');   // explicit string _id
    expect(saved.userId).toBe(validToken.userId);
    expect(saved.tokenHash).toBe(validToken.tokenHash);
    expect(saved.expiresAt).toEqual(validToken.expiresAt);
    expect(saved.used).toBe(false);
    expect(saved.createdAt).toBeDefined();
  });

  test('should fail when userId is missing', async () => {
    const data = { ...validToken, _id: 'token-2', userId: undefined };
    const token = new PasswordResetTokenModel(data);
    await expect(token.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should fail when tokenHash is missing', async () => {
    const data = { ...validToken, _id: 'token-3', tokenHash: undefined };
    const token = new PasswordResetTokenModel(data);
    await expect(token.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should fail when expiresAt is missing', async () => {
    const data = { ...validToken, _id: 'token-4', expiresAt: undefined };
    const token = new PasswordResetTokenModel(data);
    await expect(token.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should enforce unique tokenHash', async () => {
    // First token with _id 'token-5'
    await new PasswordResetTokenModel(validToken).save();
    // Second token with a different _id but same tokenHash → duplicate
    const duplicate = new PasswordResetTokenModel({
      ...validToken,
      _id: 'token-6',
    });
    await expect(duplicate.save()).rejects.toThrow(mongoose.Error.DuplicateKeyError);
  });

  test('should default used to false', async () => {
    const data = { ...validToken, _id: 'token-7', used: undefined };
    const token = new PasswordResetTokenModel(data);
    const saved = await token.save();
    expect(saved.used).toBe(false);
  });
});