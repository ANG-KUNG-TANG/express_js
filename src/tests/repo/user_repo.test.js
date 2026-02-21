import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import UserModel from '../../domain/models/user_model';
import * as userRepo from '../../infrastructure/repositories/user_repo'; // adjust path
import { UserRole } from '../../domain/base/user_enums';

describe('User Repository', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
  });

  const validUserData = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'secure123',
    role: UserRole.USER,
  };

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const user = await userRepo.createUser(validUserData);
      expect(user).toBeDefined();
      expect(user.name).toBe(validUserData.name);
      expect(user.email).toBe(validUserData.email.toLowerCase());
    });

    it('should throw duplicate email error', async () => {
      await userRepo.createUser(validUserData);
      await expect(userRepo.createUser(validUserData)).rejects.toThrow('UserEmailAlreadyExistsError');
    });

    it('should throw validation error for invalid email format', async () => {
      const invalid = { ...validUserData, email: 'not-an-email' };
      await expect(userRepo.createUser(invalid)).rejects.toThrow('Invalid email format');
    });

    it('should throw validation error for short password', async () => {
      const invalid = { ...validUserData, password: '123' };
      await expect(userRepo.createUser(invalid)).rejects.toThrow('Password must be at least 8 characters');
    });
  });

  describe('findUserById', () => {
    it('should find a user by id', async () => {
      const created = await userRepo.createUser(validUserData);
      const found = await userRepo.findUserById(created.id);
      expect(found.id).toBe(created.id);
    });

    it('should throw not found for non-existent id', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userRepo.findUserById(fakeId)).rejects.toThrow('User with id');
    });

    it('should throw validation error for invalid id', async () => {
      await expect(userRepo.findUserById('invalid')).rejects.toThrow('invalid user id format');
    });
  });

  describe('findUserByEmail', () => {
    it('should find a user by email', async () => {
      await userRepo.createUser(validUserData);
      const found = await userRepo.findUserByEmail(validUserData.email);
      expect(found.email).toBe(validUserData.email.toLowerCase());
    });

    it('should throw not found for non-existent email', async () => {
      await expect(userRepo.findUserByEmail('email is not defined')).rejects.toThrow('email is not defined');
    });
  });

  describe('authenticateUser', () => {
    it('should authenticate with correct credentials', async () => {
      await userRepo.createUser(validUserData);
      const sanitized = await userRepo.authenticateUser(validUserData.email, validUserData.password);
      expect(sanitized).not.toHaveProperty('password');
      expect(sanitized.email).toBe(validUserData.email.toLowerCase());
    });

    it('should throw invalid credentials for wrong password', async () => {
      await userRepo.createUser(validUserData);
      await expect(userRepo.authenticateUser(validUserData.email, 'wrongpass')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('promoteToAdmin', () => {
    it('should promote a user to admin', async () => {
      const created = await userRepo.createUser(validUserData);
      const promoted = await userRepo.promoteToAdmin(created.id);
      expect(promoted.role).toBe(UserRole.USER);
    });

    it('should throw not found for non-existent user', async () => {
      await expect(userRepo.promoteToAdmin(new mongoose.Types.ObjectId().toString())).rejects.toThrow(`User with id UserNotFoundError`);
    });
  });
});