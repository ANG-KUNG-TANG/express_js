import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  WritingStatus,
  TaskType,
  ExamType,
} from '../../domain/base/task_enums.js';
import TaskModel from '../../infrastructure/models/task_model.js';

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
  await TaskModel.deleteMany({});
});

describe('Task Model', () => {
  const validTask = {
    title: 'Test Task',
    description: 'This is a test task',
    status: WritingStatus.WRITING,          // matches real schema
    taskType: TaskType.TASK_2,              // required field
    examType: ExamType.ACADEMIC,            // required field
    dueDate: new Date('2025-12-31'),
    userId: new mongoose.Types.ObjectId(),
  };

  test('should create and save a task successfully', async () => {
    const task = new TaskModel(validTask);
    const savedTask = await task.save();
    expect(savedTask._id).toBeDefined();
    expect(savedTask.title).toBe(validTask.title);
    expect(savedTask.description).toBe(validTask.description);
    expect(savedTask.status).toBe(WritingStatus.WRITING);
    expect(savedTask.taskType).toBe(TaskType.TASK_2);
    expect(savedTask.examType).toBe(ExamType.ACADEMIC);
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

  test('should fail when taskType is missing', async () => {
    const taskData = { ...validTask, taskType: undefined };
    const task = new TaskModel(taskData);
    await expect(task.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should fail when examType is missing', async () => {
    const taskData = { ...validTask, examType: undefined };
    const task = new TaskModel(taskData);
    await expect(task.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should fail when taskType is invalid', async () => {
    const taskData = { ...validTask, taskType: 'TASK_99' };
    const task = new TaskModel(taskData);
    await expect(task.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should fail when examType is invalid', async () => {
    const taskData = { ...validTask, examType: 'BASIC' };
    const task = new TaskModel(taskData);
    await expect(task.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should set default status to ASSIGNED if not provided', async () => {
    const taskData = {
      title: 'Default Task',
      userId: new mongoose.Types.ObjectId(),
      taskType: TaskType.TASK_1,
      examType: ExamType.GENERAL,
    };
    const task = new TaskModel(taskData);
    const savedTask = await task.save();
    expect(savedTask.status).toBe(WritingStatus.ASSIGNED);
  });

  test('should allow null dueDate', async () => {
    const taskData = { ...validTask, dueDate: null };
    const task = new TaskModel(taskData);
    const savedTask = await task.save();
    expect(savedTask.dueDate).toBeNull();
  });
});