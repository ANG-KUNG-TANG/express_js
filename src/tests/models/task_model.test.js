import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { TaskStatus, TaskPriority } from '../../domain/base/task_enums';
import TaskModel from '../../domain/models/task_model';


beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
},30000);

afterAll(async () => {
  await mongoose.disconnect();
});

afterEach(async () => {
  await TaskModel.deleteMany({});
});

describe('Task Model', () => {
  const validTask = {
    title: 'Test Task',
    description: 'This is a test task',
    status: TaskStatus.PENDING,
    priority: TaskPriority.HIGH,
    dueDate: new Date('2025-12-31'),
    userId: new mongoose.Types.ObjectId(), // simulate a user ID
  };

  test('should create and save a task successfully', async () => {
    const task = new TaskModel(validTask);
    const savedTask = await task.save();
    expect(savedTask._id).toBeDefined();
    expect(savedTask.title).toBe(validTask.title);
    expect(savedTask.description).toBe(validTask.description);
    expect(savedTask.status).toBe(validTask.status);
    expect(savedTask.priority).toBe(validTask.priority);
    expect(savedTask.dueDate).toEqual(validTask.dueDate);
    expect(savedTask.userId).toEqual(validTask.userId);
    expect(savedTask.createdAt).toBeDefined();
    expect(savedTask.updatedAt).toBeDefined();
  });

  test('should fail when title is missing', async () => {
    const taskData = { ...validTask, title: undefined };
    const task = new TaskModel(taskData);
    await expect(task.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should fail when title is too short', async () => {
    const taskData = { ...validTask, title: 'ab' };
    const task = new TaskModel(taskData);
    await expect(task.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should fail when userId is missing', async () => {
    const taskData = { ...validTask, userId: undefined };
    const task = new TaskModel(taskData);
    await expect(task.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should fail when status is invalid', async () => {
    const taskData = { ...validTask, status: 'INVALID_STATUS' };
    const task = new TaskModel(taskData);
    await expect(task.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should fail when priority is invalid', async () => {
    const taskData = { ...validTask, priority: 'INVALID_PRIORITY' };
    const task = new TaskModel(taskData);
    await expect(task.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should set default status and priority if not provided', async () => {
    const taskData = {
      title: 'Default Task',
      userId: new mongoose.Types.ObjectId(),
    };
    const task = new TaskModel(taskData);
    const savedTask = await task.save();
    expect(savedTask.status).toBe(TaskStatus.PENDING);
    expect(savedTask.priority).toBe(TaskPriority.MEDIUM);
  });

  test('should allow null dueDate', async () => {
    const taskData = { ...validTask, dueDate: null };
    const task = new TaskModel(taskData);
    const savedTask = await task.save();
    expect(savedTask.dueDate).toBeNull();
  });
});