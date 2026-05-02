// src/tests/repo/task_repo.test.js
import mongoose from 'mongoose';
import WritingTaskModel from '../../infrastructure/models/task_model.js';
import UserModel from '../../infrastructure/models/user_model.js';
import * as taskRepo from '../../infrastructure/repositories/task_repo.js';
import { WritingStatus } from '../../domain/base/task_enums.js';
import { UserRole } from '../../domain/base/user_enums.js';

describe('Task Repository', () => {
  let testUser;

  beforeAll(async () => {
    await mongoose.connect(process.env.__MONGO_URI__ + 'task-repo-test');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await WritingTaskModel.deleteMany({});
    await UserModel.deleteMany({});
    testUser = await UserModel.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'SecurePassword123',
      role: UserRole.USER,
    });
  });

  const getValidTaskData = () => ({
    title: 'Test Title',
    description: 'Test Description',
    status: WritingStatus.ASSIGNED,
    examType: 'ACADEMIC',
    taskType: 'TASK_2',
    userId: testUser._id.toString(),
  });

  // ── createTask ─────────────────────────────────────────────────────────────
  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const task = await taskRepo.createTask(getValidTaskData());
      expect(task).toBeDefined();
      expect(task._title).toBe('Test Title');
      expect(task._userId).toBe(testUser._id.toString());
    });

    it('should throw for duplicate title on same user', async () => {
      await taskRepo.createTask(getValidTaskData());
      await expect(taskRepo.createTask(getValidTaskData()))
        .rejects.toThrow('Task with title "Test Title" already exists');
    });

    it('should throw for missing title', async () => {
      const data = { ...getValidTaskData(), title: undefined };
      await expect(taskRepo.createTask(data)).rejects.toThrow('Title must be at least 3 characters long');
    });
  });

  // ── findTaskByID ───────────────────────────────────────────────────────────
  describe('findTaskByID', () => {
    it('should find a task by id', async () => {
      const created = await taskRepo.createTask(getValidTaskData());
      const found = await taskRepo.findTaskByID(created.id);
      expect(found.id).toBe(created.id);
    });

    it('should throw not found for non-existent id', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(taskRepo.findTaskByID(fakeId)).rejects.toThrow('Task with id');
    });

    it('should throw for invalid id format', async () => {
      await expect(taskRepo.findTaskByID('bad-format-xyz')).rejects.toThrow('bad-format-xyz');
    });
  });

  // ── updateTask ─────────────────────────────────────────────────────────────
  describe('updateTask', () => {
    it('should update task fields', async () => {
      const created = await taskRepo.createTask(getValidTaskData());
      const updated = await taskRepo.updateTask(created.id, { title: 'Updated Title', status: WritingStatus.SUBMITTED });
      expect(updated._title).toBe('Updated Title');
      expect(updated._status).toBe(WritingStatus.SUBMITTED);
    });

    it('should throw not found for non-existent id', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(taskRepo.updateTask(fakeId, { title: 'x' })).rejects.toThrow('Task with id');
    });
  });

  // ── deleteTask ─────────────────────────────────────────────────────────────
  describe('deleteTask', () => {
    it('should delete a task', async () => {
      const created = await taskRepo.createTask(getValidTaskData());
      const result = await taskRepo.deleteTask(created.id);
      expect(result).toBe(true);
      await expect(taskRepo.findTaskByID(created.id)).rejects.toThrow('Task with id');
    });
  });

  // ── findTasks ──────────────────────────────────────────────────────────────
  describe('findTasks', () => {
    beforeEach(async () => {
      const base = getValidTaskData();
      await taskRepo.createTask({ ...base, title: 'task 1', status: WritingStatus.ASSIGNED });
      await taskRepo.createTask({ ...base, title: 'task 2', status: WritingStatus.WRITING });
      await taskRepo.createTask({ ...base, title: 'task 3', status: WritingStatus.SUBMITTED });
    });

    it('should return all tasks', async () => {
      const tasks = await taskRepo.findTasks();
      expect(tasks).toHaveLength(3);
    });

    it('should filter by status', async () => {
      // status goes in the second (options) argument
      const tasks = await taskRepo.findTasks({}, { status: WritingStatus.WRITING });
      expect(tasks).toHaveLength(1);
    });

    it('should filter by userId', async () => {
      const tasks = await taskRepo.findTasks({}, { userId: testUser._id.toString() });
      expect(tasks).toHaveLength(3);
    });

    it('should apply pagination', async () => {
      const tasks = await taskRepo.findTasks({}, { page: 1, limit: 2 });
      expect(tasks).toHaveLength(2);
    });
  });

  // ── startWritingTask / submitTask ──────────────────────────────────────────
  describe('startWritingTask and submitTask', () => {
    it('should transition ASSIGNED → WRITING', async () => {
      const created = await taskRepo.createTask(getValidTaskData());
      const started = await taskRepo.startWritingTask(created);
      expect(started._status).toBe(WritingStatus.WRITING);
    });

    it('should submit a WRITING task with enough words', async () => {
      const created = await taskRepo.createTask({ ...getValidTaskData(), status: WritingStatus.WRITING, taskType: 'TASK_1' });
      const submitted = await taskRepo.submitTask(created.id, 'word '.repeat(155).trim());
      expect(submitted._status).toBe(WritingStatus.SUBMITTED);
    });

    it('should throw when starting a non-ASSIGNED task', async () => {
      const created = await taskRepo.createTask({ ...getValidTaskData(), status: WritingStatus.SUBMITTED });
      await expect(taskRepo.startWritingTask(created)).rejects.toThrow('Only assigned tasks can be started');
    });
  });

  // ── searchTasksByTitle ─────────────────────────────────────────────────────
  describe('searchTasksByTitle', () => {
    it('should find tasks by title substring', async () => {
      await taskRepo.createTask({ ...getValidTaskData(), title: 'Special Project' });
      const results = await taskRepo.searchTasksByTitle('special');
      expect(results).toHaveLength(1);
      expect(results[0]._title).toBe('Special Project');
    });
  });

  // ── getUserTaskStats ───────────────────────────────────────────────────────
  describe('getUserTaskStats', () => {
    it('should return correct stats', async () => {
      await taskRepo.createTask({ ...getValidTaskData(), title: 'Task 1', status: WritingStatus.ASSIGNED });
      await taskRepo.createTask({ ...getValidTaskData(), title: 'Task 2', status: WritingStatus.SUBMITTED });
      const stats = await taskRepo.getUserTaskStats(testUser._id.toString());
      expect(stats.total).toBe(2);
      expect(stats.byStatus[WritingStatus.ASSIGNED]).toBe(1);
      expect(stats.byStatus[WritingStatus.SUBMITTED]).toBe(1);
    });
  });

  // ── transferTasks ──────────────────────────────────────────────────────────
  describe('transferTasks', () => {
    it('should transfer all tasks from one user to another', async () => {
      const otherUser = await UserModel.create({
        name: 'Other',
        email: 'other@example.com',
        password: 'password123',
        role: UserRole.USER,
      });
      await taskRepo.createTask({ ...getValidTaskData(), title: 'Task A' });
      await taskRepo.createTask({ ...getValidTaskData(), title: 'Task B' });
      const result = await taskRepo.transferTasks(testUser._id.toString(), otherUser._id.toString());
      expect(result.transferred).toBe(2);
      const transferred = await taskRepo.findTasks({}, { userId: otherUser._id.toString() });
      expect(transferred).toHaveLength(2);
    });
  });
});