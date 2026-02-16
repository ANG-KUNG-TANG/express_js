import mongoose from "mongoose";
import { MongoMemoryServer } from 'mongodb-memory-server';
import TaskModel from "../../domain/models/task_model";
import UserModel from "../../domain/models/user_model";
import * as taskRepo from '../../infrastructure/repositories/task_repo';
import { TaskStatus, TaskPriority } from '../../domain/base/task_enums';
import { UserRole } from "../../domain/base/user_enums";

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
    await TaskModel.deleteMany({});
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
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    dueDate: new Date('2025-12-31'),
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
      await expect(taskRepo.createTask(taskData)).rejects.toThrow('TaskDuplicateTitleError');
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
      await expect(taskRepo.findTaskByID(fakeId)).rejects.toThrow('TaskNotFoundError');
    });

    it("should throw invalid id error for malformed id", async () => {
      await expect(taskRepo.findTaskByID("invalid-id")).rejects.toThrow('TaskInvalidIdError');
    });
  });

  describe('updateTask', () => {
    it('should update task fields', async () => {
      const created = await taskRepo.createTask(getValidTaskData());
      const updates = { title: 'Updated Title', priority: TaskPriority.HIGH };
      const updated = await taskRepo.updateTask(created.id, updates);
      expect(updated._title).toBe('Updated Title');
      expect(updated.priority).toBe(TaskPriority.HIGH);
    });

    it('should throw not found for non-existent id', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(taskRepo.updateTask(fakeId, { title: 'x' })).rejects.toThrow('TaskNotFoundError');
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      const created = await taskRepo.createTask(getValidTaskData());
      const result = await taskRepo.deleteTask(created.id);
      expect(result).toBe(true);
      await expect(taskRepo.findTaskByID(created.id)).rejects.toThrow('TaskNotFoundError');
    });
  });

  describe('findTasks', () => {
    beforeEach(async () => {
      const base = getValidTaskData();
      await taskRepo.createTask({ ...base, title: "task 1", status: TaskStatus.PENDING });
      await taskRepo.createTask({ ...base, title: "task 2", status: TaskStatus.IN_PROGRESS });
      await taskRepo.createTask({ ...base, title: "task 3", status: TaskStatus.COMPLETED });
    });

    it('should return all tasks with default options', async () => {
      const tasks = await taskRepo.findTasks();
      expect(tasks).toHaveLength(3);
    });

    it('should filter by status', async () => {
      const tasks = await taskRepo.findTasks({ status: TaskStatus.IN_PROGRESS });
      expect(tasks).toHaveLength(1);
    });

    it('should filter by userId', async () => {
      const tasks = await taskRepo.findTasks({ userId: testUser._id.toString() });
      expect(tasks).toHaveLength(3);
    });

    it('should apply pagination', async () => {
      const tasks = await taskRepo.findTasks({}, { skip: 1, limit: 1 });
      expect(tasks).toHaveLength(1);
    });
  });

  describe('startTask and completeTask', () => {
    it('should transition from pending to in_progress', async () => {
      const created = await taskRepo.createTask(getValidTaskData());
      const started = await taskRepo.startTask(created.id);
      expect(started.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should transition from in_progress to completed', async () => {
      const data = { ...getValidTaskData(), status: TaskStatus.IN_PROGRESS };
      const created = await taskRepo.createTask(data);
      const completed = await taskRepo.completeTask(created.id);
      expect(completed.status).toBe(TaskStatus.COMPLETED);
    });

    it('should throw error when starting a non-pending task', async () => {
      const data = { ...getValidTaskData(), status: TaskStatus.COMPLETED };
      const created = await taskRepo.createTask(data);
      await expect(taskRepo.startTask(created.id)).rejects.toThrow('Only pending tasks can start');
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
});Z

  describe('getUserTaskStats', () => {
  it('should return correct stats', async () => {
    await taskRepo.createTask({
      ...getValidTaskData(),
      title: 'Task 1',                 
      status: TaskStatus.PENDING,
      priority: TaskPriority.HIGH,
    });
    await taskRepo.createTask({
      ...getValidTaskData(),
      title: 'Task 2',                 
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.LOW,
    });
    const stats = await taskRepo.getUserTaskStats(testUser._id.toString());
    expect(stats.total).toBe(2);
    expect(stats.byStatus[TaskStatus.PENDING]).toBe(1);
    expect(stats.byPriority[TaskPriority.LOW]).toBe(1);
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
    const tasksForOther = await taskRepo.findTasks({ userId: otherUser._id.toString() });
    expect(tasksForOther).toHaveLength(2);
  });
});
});