import mongoose from 'mongoose';
import { UserRole } from '../../domain/base/user_enums';
import UserModel from '../../domain/models/user_model';


beforeAll(async () => {
  await mongoose.connect(global.__MONGO_URI__);
},30000);

afterAll(async () => {
  await mongoose.disconnect();
});

afterEach(async () => {
  await UserModel.deleteMany({});
});

describe('User Model', () => {
  const validUser = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'securePassword123',
    role: UserRole.USER,
  };

  test('should create and save a user successfully', async () => {
    const user = new UserModel(validUser);
    const savedUser = await user.save();
    expect(savedUser._id).toBeDefined();
    expect(savedUser.name).toBe(validUser.name);
    expect(savedUser.email).toBe(validUser.email);
    expect(savedUser.password).toBe(validUser.password);
    expect(savedUser.role).toBe(validUser.role);
    expect(savedUser.createdAt).toBeDefined();
    expect(savedUser.updatedAt).toBeDefined();
  });

  test('should fail when name is missing', async () => {
    const userData = { ...validUser, name: undefined };
    const user = new UserModel(userData);
    await expect(user.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should fail when name is too short', async () => {
    const userData = { ...validUser, name: 'Jo' };
    const user = new UserModel(userData);
    await expect(user.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should fail when email is missing', async () => {
    const userData = { ...validUser, email: undefined };
    const user = new UserModel(userData);
    await expect(user.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should fail when email is invalid format', async () => {
    const userData = { ...validUser, email: 'invalid-email' };
    const user = new UserModel(userData);
    await expect(user.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should convert email to lowercase', async () => {
    const userData = { ...validUser, email: 'John.Doe@Example.com' };
    const user = new UserModel(userData);
    const savedUser = await user.save();
    expect(savedUser.email).toBe('john.doe@example.com');
  });

  test('should enforce unique email', async () => {
    const user1 = new UserModel(validUser);
    await user1.save();

    const user2 = new UserModel(validUser);
    await expect(user2.save()).rejects.toThrow(mongoose.Error.DuplicateKeyError);
  });

  test('should fail when password is too short', async () => {
    const userData = { ...validUser, password: 'short' };
    const user = new UserModel(userData);
    await expect(user.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should set default role if not provided', async () => {
    const userData = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'anotherPass123',
    };
    const user = new UserModel(userData);
    const savedUser = await user.save();
    expect(savedUser.role).toBe(UserRole.USER);
  });

  test('should fail when role is invalid', async () => {
    const userData = { ...validUser, role: 'INVALID_ROLE' };
    const user = new UserModel(userData);
    await expect(user.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });
});