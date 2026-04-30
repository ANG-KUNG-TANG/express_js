import mongoose from "mongoose";
import { MongoMemoryServer } from 'mongodb-memory-server';
import WritingTaskModel from "../../infrastructure/models/task_model.js";
import UserModel from "../../infrastructure/models/user_model.js";
import * as taskRepo from '../../infrastructure/repositories/task_repo.js';
import { WritingStatus, AssignmentStatus } from '../../domain/base/task_enums.js';
import { UserRole } from '../../domain/base/user_enums.js';

describe('Task Repository', () => {
  let mongoServer;
  let testUser;

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
    await WritingTaskModel.deleteMany({});
    await UserModel.deleteMany({});

    testUser = await UserModel.create({
      name: "Test User",
      email: "test@example.com",
      password: "SecurePassword123",
      role: UserRole.USER,
    });
  });

  const getValidTaskData = () => ({
    title: "Test Title",
    description: "Test Description",
    status: WritingStatus.ASSIGNED,
    examType: "ACADEMIC",
    taskType: "TASK_2",
    userId: testUser._id.toString(),
  });

  describe("createTask", () => {
    it('should create a task successfully', async () => {
      const taskData = getValidTaskData();
      const task = await taskRepo.createTask(taskData);
      expect(task).toBeDefined();
      expect(task._title).toBe(taskData.title);
      expect(task._userId).toBe(taskData.userId);
    });

    it('should throw duplicate title error for same user', async () => {
      const taskData = getValidTaskData();
      await taskRepo.createTask(taskData);
      // Exact error message with a space before the quote
      await expect(taskRepo.createTask(taskData)).rejects.toThrow(
        'Task with title "Test Title" already exists'
      );
    });

    it('should throw validation error when title is missing', async () => {
      const taskData = getValidTaskData();
      const invalid = { ...taskData, title: undefined };
      await expect(taskRepo.createTask(invalid)).rejects.toThrow('Title must be at least 3 characters long');
    });
  });

  describe('findTaskById', () => {
    it('should find a task by id', async () => {
      const created = await taskRepo.createTask(getValidTaskData());
      const found = await taskRepo.findTaskByID(created.id);
      expect(found.id).toBe(created.id);
    });

    it("should throw not found for non-existent id", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(taskRepo.findTaskByID(fakeId)).rejects.toThrow('Task with id');
    });

    it("should throw invalid id error for malformed id", async () => {
      await expect(taskRepo.findTaskByID("invalid-id")).rejects.toThrow('invalid-id');
    });
  });

  describe('updateTask', () => {
    it('should update task fields', async () => {
      const created = await taskRepo.createTask(getValidTaskData());
      const updates = { title: 'Updated Title', status: WritingStatus.SUBMITTED };
      const updated = await taskRepo.updateTask(created.id, updates);
      expect(updated._title).toBe('Updated Title');
      expect(updated._status).toBe(WritingStatus.SUBMITTED);
    });

    it('should throw not found for non-existent id', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(taskRepo.updateTask(fakeId, { title: 'x' })).rejects.toThrow('Task with id');
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      const created = await taskRepo.createTask(getValidTaskData());
      const result = await taskRepo.deleteTask(created.id);
      expect(result).toBe(true);
      await expect(taskRepo.findTaskByID(created.id)).rejects.toThrow('Task with id');
    });
  });

  describe('findTasks', () => {
    beforeEach(async () => {
      const base = getValidTaskData();
      await taskRepo.createTask({ ...base, title: "task 1", status: WritingStatus.ASSIGNED });
      await taskRepo.createTask({ ...base, title: "task 2", status: WritingStatus.WRITING });
      await taskRepo.createTask({ ...base, title: "task 3", status: WritingStatus.SUBMITTED });
    });

    it('should return all tasks with default options', async () => {
      const tasks = await taskRepo.findTasks();
      expect(tasks).toHaveLength(3);
    });

    it('should filter by status', async () => {
      const tasks = await taskRepo.findTasks({ status: WritingStatus.WRITING });
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

  describe('startWritingTask and submitTask', () => {
    it('should transition from ASSIGNED to WRITING', async () => {
      const created = await taskRepo.createTask(getValidTaskData());
      const started = await taskRepo.startWritingTask(created);
      expect(started._status).toBe(WritingStatus.WRITING);
    });

    it('should submit a WRITING task (with enough words)', async () => {
      // Use TASK_1 to require 150 words, and provide enough.
      const base = { ...getValidTaskData(), status: WritingStatus.WRITING, taskType: 'TASK_1' };
      const created = await taskRepo.createTask(base);
      const longText = 'word '.repeat(155).trim(); // 155 words
      const submitted = await taskRepo.submitTask(created.id, longText);
      expect(submitted._status).toBe(WritingStatus.SUBMITTED);
    });

    it('should throw error when starting a non-ASSIGNED task', async () => {
      const data = { ...getValidTaskData(), status: WritingStatus.SUBMITTED };
      const created = await taskRepo.createTask(data);
      await expect(taskRepo.startWritingTask(created)).rejects.toThrow('Only assigned tasks can be started');
    });
  });

  describe('searchTasksByTitle', () => {
    it('should find tasks by title substring', async () => {
      const data = { ...getValidTaskData(), title: 'Special Project' };
      await taskRepo.createTask(data);
      const results = await taskRepo.searchTasksByTitle('special');
      expect(results).toHaveLength(1);
      expect(results[0]._title).toBe('Special Project');
    });
  });

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
      const tasksForOther = await taskRepo.findTasks({}, { userId: otherUser._id.toString() });
      expect(tasksForOther).toHaveLength(2);
    });
  });
});