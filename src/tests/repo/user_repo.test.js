// src/tests/repo/user_repo.test.js
import mongoose from 'mongoose';
import UserModel from '../../infrastructure/models/user_model.js';
import * as userRepo from '../../infrastructure/repositories/user_repo.js';
import { UserRole } from '../../domain/base/user_enums.js';
import { hashPassword } from '../../app/validators/password_hash.js';

describe('User Repository', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.__MONGO_URI__ + 'user-repo-test');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
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

  const seedUser = (overrides = {}) =>
    userRepo.createUser({ ...validUserData, ...overrides });

  const seedUserWithHash = async (overrides = {}) => {
    const data = { ...validUserData, ...overrides };
    const hashed = await hashPassword(data.password);
    return userRepo.createUser({ ...data, password: hashed });
  };

  // ── createUser ─────────────────────────────────────────────────────────────
  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const user = await userRepo.createUser(validUserData);
      expect(user).toBeDefined();
      expect(user.name).toBe(validUserData.name);
      expect(user.email).toBe(validUserData.email.toLowerCase());
      expect(user.role).toBe(UserRole.USER);
    });

    it('should throw duplicate email error', async () => {
      await seedUser();
      await expect(userRepo.createUser(validUserData)).rejects.toThrow('UserEmailAlreadyExistsError');
    });

    it('should throw for invalid email format', async () => {
      await expect(userRepo.createUser({ ...validUserData, email: 'not-an-email' }))
        .rejects.toThrow('Invalid email format');
    });

    it('should throw for short password', async () => {
      await expect(userRepo.createUser({ ...validUserData, password: '123' }))
        .rejects.toThrow('Password must be at least 8 characters');
    });

    it('should lowercase the email before saving', async () => {
      const user = await userRepo.createUser({ ...validUserData, email: 'JOHN@EXAMPLE.COM' });
      expect(user.email).toBe('john@example.com');
    });
  });

  // ── findUserById ───────────────────────────────────────────────────────────
  describe('findUserById', () => {
    it('should find a user by id', async () => {
      const created = await seedUser();
      const found = await userRepo.findUserById(created.id);
      expect(found.id).toBe(created.id);
    });

    it('should throw not found for non-existent id', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userRepo.findUserById(fakeId)).rejects.toThrow('User with id');
    });

    it('should throw for invalid id format', async () => {
      await expect(userRepo.findUserById('invalid')).rejects.toThrow('invalid user id format');
    });
  });

  // ── findUserByEmail ────────────────────────────────────────────────────────
  describe('findUserByEmail', () => {
    it('should find a user by email', async () => {
      await seedUser();
      const found = await userRepo.findUserByEmail('john@example.com');
      expect(found.email).toBe('john@example.com');
    });

    it('should be case insensitive', async () => {
      await seedUser();
      const found = await userRepo.findUserByEmail('JOHN@EXAMPLE.COM');
      expect(found.email).toBe('john@example.com');
    });

    it('should throw for non-existent email', async () => {
      await expect(userRepo.findUserByEmail('none@example.com')).rejects.toThrow('none@example.com');
    });
  });

  // ── findUserByEmailWithPassword ────────────────────────────────────────────
  describe('findUserByEmailWithPassword', () => {
    it('should return user with password field included', async () => {
      await seedUser();
      const found = await userRepo.findUserByEmailWithPassword('john@example.com');
      expect(found).toBeDefined();
      expect(found.email).toBe('john@example.com');
    });

    it('should throw for non-existent email', async () => {
      await expect(userRepo.findUserByEmailWithPassword('no@example.com')).rejects.toThrow('no@example.com');
    });
  });

  // ── authenticateUser ───────────────────────────────────────────────────────
  describe('authenticateUser', () => {
    it('should authenticate with correct credentials', async () => {
      await seedUserWithHash();
      const result = await userRepo.authenticateUser('john@example.com', 'secure123');
      expect(result).toHaveProperty('id');
      expect(result.email).toBe('john@example.com');
      expect(result.password).toBeUndefined();
    });

    it('should throw for wrong password', async () => {
      await seedUserWithHash();
      await expect(userRepo.authenticateUser('john@example.com', 'wrongpass'))
        .rejects.toThrow('Invalid credentials');
    });

    it('should throw for unknown email', async () => {
      await expect(userRepo.authenticateUser('unknown@example.com', 'any'))
        .rejects.toThrow('unknown@example.com');
    });
  });

  // ── promoteToAdmin ─────────────────────────────────────────────────────────
  describe('promoteToAdmin', () => {
    it('should promote a user to admin', async () => {
      const created = await seedUser();
      const promoted = await userRepo.promoteToAdmin(created.id);
      expect(promoted.role).toBe(UserRole.ADMIN);
    });

    it('should throw not found for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userRepo.promoteToAdmin(fakeId)).rejects.toThrow('User with id');
    });
  });

  // ── deleteUser ─────────────────────────────────────────────────────────────
  describe('deleteUser', () => {
    it('should delete an existing user', async () => {
      const created = await seedUser();
      await userRepo.deleteUser(created.id);
      await expect(userRepo.findUserById(created.id)).rejects.toThrow('User with id');
    });

    it('should throw not found for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userRepo.deleteUser(fakeId)).rejects.toThrow('User with id');
    });

    it('should throw for invalid id format', async () => {
      await expect(userRepo.deleteUser('invalid')).rejects.toThrow('invalid user id format');
    });
  });

  // ── updateUser ─────────────────────────────────────────────────────────────
  describe('updateUser', () => {
    it('should update allowed fields', async () => {
      const created = await seedUser();
      const updated = await userRepo.updateUser(created.id, { name: 'Jane Doe', bio: 'New bio', targetBand: 7.5 });
      expect(updated.name).toBe('Jane Doe');
      expect(updated.bio).toBe('New bio');
    });

    it('should lowercase email on update', async () => {
      const created = await seedUser();
      const updated = await userRepo.updateUser(created.id, { email: 'NEW@EXAMPLE.COM' });
      expect(updated.email).toBe('new@example.com');
    });

    it('should throw not found for non-existent id', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userRepo.updateUser(fakeId, { name: 'x' })).rejects.toThrow('User with id');
    });
  });

  // ── listAllUsers ───────────────────────────────────────────────────────────
  describe('listAllUsers', () => {
    it('should return all users without passwords', async () => {
      await seedUser({ email: 'a@example.com' });
      await seedUser({ email: 'b@example.com' });
      const users = await userRepo.listAllUsers();
      expect(users).toHaveLength(2);
      users.forEach(u => expect(u.password).toBeUndefined());
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('should filter by role', async () => {
      await seedUser({ role: UserRole.USER,  email: 'u1@example.com' });
      await seedUser({ role: UserRole.ADMIN, email: 'u2@example.com' });
      const admins = await userRepo.findAll({ role: UserRole.ADMIN });
      expect(admins).toHaveLength(1);
      expect(admins[0].role).toBe(UserRole.ADMIN);
    });

    it('should throw for invalid assignedTeacher id', async () => {
      await expect(userRepo.findAll({ assignedTeacher: 'bad' }))
        .rejects.toThrow('invalid assignedTeacher id format');
    });
  });

  // ── searchUsers ────────────────────────────────────────────────────────────
  describe('searchUsers', () => {
    it('should search by name or email', async () => {
      await seedUser({ name: 'Alice', email: 'alice@example.com' });
      await seedUser({ name: 'Bob',   email: 'bob@example.com' });
      const result = await userRepo.searchUsers({ q: 'alice' });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by role', async () => {
      await seedUser({ role: UserRole.USER,  email: 'u1@example.com' });
      await seedUser({ role: UserRole.ADMIN, email: 'u2@example.com' });
      const result = await userRepo.searchUsers({ role: UserRole.ADMIN });
      expect(result.total).toBe(1);
    });

    it('should paginate results', async () => {
      await seedUser({ email: 'u1@example.com' });
      await seedUser({ email: 'u2@example.com' });
      const result = await userRepo.searchUsers({ page: 1, limit: 1 });
      expect(result.data).toHaveLength(1);
      expect(result.pages).toBe(2);
    });
  });

  // ── suspend / reactivate ───────────────────────────────────────────────────
  describe('suspend / reactivate', () => {
    it('should suspend an active user', async () => {
      const created = await seedUser();
      const result = await userRepo.suspendUser(created.id);
      expect(result.id).toBe(created.id);
    });

    it('should reactivate a suspended user', async () => {
      const created = await seedUser();
      await userRepo.suspendUser(created.id);
      const result = await userRepo.reactivateUser(created.id);
      expect(result.id).toBe(created.id);
    });

    it('should throw not found for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(userRepo.suspendUser(fakeId)).rejects.toThrow('User with id');
    });
  });

  // ── setPasswordResetRequired ───────────────────────────────────────────────
  describe('setPasswordResetRequired', () => {
    it('should flag the account', async () => {
      const created = await seedUser();
      const updated = await userRepo.setPasswordResetRequired(created.id);
      expect(updated.id).toBe(created.id);
    });
  });

  // ── demoteToStudent ────────────────────────────────────────────────────────
  describe('demoteToStudent', () => {
    it('should change role to USER and clear assignedTeacher', async () => {
      const created = await seedUser({ role: UserRole.TEACHER });
      const demoted = await userRepo.demoteToStudent(created.id);
      expect(demoted.role).toBe(UserRole.USER);
      expect(demoted.assignedTeacher).toBeNull();
    });
  });

  // ── bulk operations ────────────────────────────────────────────────────────
  describe('bulk operations', () => {
    let id1, id2;
    beforeEach(async () => {
      const u1 = await seedUser({ email: 'u1@example.com' });
      const u2 = await seedUser({ email: 'u2@example.com' });
      id1 = u1.id;
      id2 = u2.id;
    });

    it('bulkDeleteUsers should delete multiple users', async () => {
      const result = await userRepo.bulkDeleteUsers([id1, id2]);
      expect(result.deleted).toBe(2);
      expect(await UserModel.countDocuments()).toBe(0);
    });

    it('bulkDeleteUsers should throw for invalid ids', async () => {
      await expect(userRepo.bulkDeleteUsers(['bad'])).rejects.toThrow('invalid id(s)');
    });

    it('bulkSuspendUsers should return suspended count', async () => {
      const result = await userRepo.bulkSuspendUsers([id1, id2]);
      expect(result.suspended).toBe(2);
    });

    it('bulkAssignTeacher should assign a teacher to students', async () => {
      const teacher = await seedUser({ email: 't@example.com', role: UserRole.TEACHER });
      const result = await userRepo.bulkAssignTeacher([id1, id2], teacher.id);
      expect(result.assigned).toBe(2);
      const students = await UserModel.find({ assignedTeacher: new mongoose.Types.ObjectId(teacher.id) });
      expect(students).toHaveLength(2);
    });
  });
});