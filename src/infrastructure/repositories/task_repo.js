import TaskModel from "../../domain/models/task_model";
import { Task } from "../../domain/entities/task_entity";
import { TaskStatus, TaskPriority } from "../../domain/base/task_enums";
import mongoose from 'mongoose';
import {
  TaskInvalidUserIdError,
  TaskNotFoundError,
  TaskDuplicateTitleError,
  TaskValidationError,
  TaskOwnershipError,
} from '../../core/errors/task.errors.js';

const toDomain = (doc) => {
  if (!doc) return null;
  return new Task({
    id: doc._id.toString(),
    title: doc.title,                
    description: doc.description,
    status: doc.status,               
    priority: doc.priority,           
    dueDate: doc.dueDate,             
    userId: doc.userId? doc.userId.toString(): undefined,    
    createdAt: doc.createdAt,          
    updatedAt: doc.updatedAt,
  });
};

const toDomainList = (docs) => docs.map(toDomain).filter((t) => t !== null);

const toPersistence = (task) => {
  if (!task) return null;
  return {
    ...(task._id && mongoose.Types.ObjectId.isValid(task._id) && {
      _id: new mongoose.Types.ObjectId(task._id)
    }),
    title: task._title,
    description: task._description,
    status: task._status,
    priority: task._priority,
    dueDate: task._dueDate,
    userId: task._userId ? new mongoose.Types.ObjectId(task._userId) : undefined,
    createdAt: task._createdAt,
    updatedAt: task._updatedAt,
  };
};

export const findTaskByID = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new TaskInvalidUserIdError('TaskInvalidIdError');
  }
  const doc = await TaskModel.findById(id).lean();
  if (!doc) throw new TaskNotFoundError('TaskNotFoundError');
  return toDomain(doc);
};

export const findTasks = async (filter = {}, options = {}) => {
  const {
    skip = 0,
    limit = 100,
    sort = { createdAt: -1 },
    status,
    priority,
    userId,
    dueDateBefore,
    dueDateAfter,
  } = options;

  const query = { ...filter };

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new TaskInvalidUserIdError(userId);
    }
    query.userId = new mongoose.Types.ObjectId(userId);
  }
  if (dueDateBefore || dueDateAfter) {
    query.dueDate = {};
    if (dueDateBefore) query.dueDate.$lte = dueDateBefore;
    if (dueDateAfter) query.dueDate.$gte = dueDateAfter;
  }

  const docs = await TaskModel.find(query)
    .skip(skip)
    .limit(limit)
    .sort(sort)
    .lean();
  return toDomainList(docs);
};

export const createTask = async (taskData) => {
  const task = new Task(taskData);
  const existing = await TaskModel.findOne({
    title: task._title,
    userId: task._userId,
  }).lean();
  if (existing) {
    throw new TaskDuplicateTitleError('TaskDuplicateTitleError');
  }
  const persistence = toPersistence(task);
  try {
    const [doc] = await TaskModel.create([persistence]);
    return toDomain(doc);
  } catch (err) {
    if (err.name === "ValidationError") {
      const message = Object.values(err.errors).map((e) => e.message).join(', ');
      throw new TaskValidationError(message);
    }
    if (err.code === 11000) {
      throw new TaskDuplicateTitleError(task._title);
    }
    throw err;
  }
};

export const updateTask = async (id, updates) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new TaskInvalidUserIdError(id);
  }
  const existing = await TaskModel.findById(id);
  if (!existing) throw new TaskNotFoundError('TaskNotFoundError');

  const task = toDomain(existing);
  if (updates.title !== undefined) {
    task._validateTitle(updates.title);
    task._title = updates.title;
  }
  if (updates.description !== undefined) {
    task._description = updates.description;
  }
  if (updates.status !== undefined) {
    task._status = updates.status;
  }
  if (updates.priority !== undefined) {
    task._priority = updates.priority;
  }
  if (updates.dueDate !== undefined) {
    if (updates.dueDate) {
      task._validateDueDate(updates.dueDate);
      task._dueDate = new Date(updates.dueDate);
    } else {
      task._dueDate = null;
    }
  }
  task._updatedAt = new Date();

  const doc = await TaskModel.findByIdAndUpdate(
    id,
    {
      title: task._title,
      description: task._description,
      status: task._status,
      priority: task._priority,
      dueDate: task._dueDate,
      updatedAt: task._updatedAt,
    },
    {
      returnDocument: 'after',
      runValidators: true,
    }
  ).lean();

  if (!doc) throw new TaskNotFoundError(id);
  return toDomain(doc);
};

export const deleteTask = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new TaskInvalidUserIdError(id);
  }
  const result = await TaskModel.findByIdAndDelete(id);
  if (!result) throw new TaskNotFoundError(id);
  return true;
};

export const countTasks = async (filters = {}) => {
  return await TaskModel.countDocuments(filters);
};

export const startTask = async (id) => {
  const task = await findTaskByID(id);
  task.start();
  return await updateTask(id, { status: task._status, updatedAt: new Date() });
};

export const completeTask = async (id) => {
  const task = await findTaskByID(id);
  task.complete();
  return await updateTask(id, { status: task._status, updatedAt: new Date() });
};

export const findTaskByUser = (userId, options = {}) =>
  findTasks({ userId }, options);

export const findTaskByStatus = (status, options = {}) =>
  findTasks({ status }, options);

export const findTasksByPriority = (priority, options = {}) =>
  findTasks({ priority }, options);

export const findOverdueTasks = (options = {}) =>
  findTasks(
    {
      dueDate: { $lt: new Date() },
      status: { $ne: TaskStatus.COMPLETED },
    },
    options
  );

export const searchTasksByTitle = async (searchTerm, options = {}) => {
  const { skip = 0, limit = 20, sort = { createdAt: -1 } } = options;
  const docs = await TaskModel.find({ title: { $regex: searchTerm, $options: 'i' } })
    .skip(skip)
    .limit(limit)
    .sort(sort)
    .lean();
  return toDomainList(docs);
};

export const getUserTaskStats = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new TaskInvalidUserIdError(userId);
  }
  const stats = await TaskModel.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $facet: {
        total: [{ $count: "count" }],
        byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        byPriority: [{ $group: { _id: "$priority", count: { $sum: 1 } } }],
        overdue: [
          {
            $match: {
              dueDate: { $lt: new Date() },
              status: { $ne: TaskStatus.COMPLETED },
            },
          },
          { $count: "count" },
        ],
      },
    },
  ]);
  const result = stats[0] || {};
  return {
    total: result.total[0]?.count || 0,
    byStatus: Object.fromEntries(result.byStatus?.map((s) => [s._id, s.count]) || []),
    byPriority: Object.fromEntries(result.byPriority?.map((p) => [p._id, p.count]) || []),
    overdue: result.overdue[0]?.count || 0,
  };
};

export const ensureTaskOwnership = (task, userId) => {
  if (task._userId.toString() !== userId) {
    throw new TaskOwnershipError(userId, task.id);
  }
};

export const transferTasks = async (fromUserId, toUserId, session = null) => {
  if (!mongoose.Types.ObjectId.isValid(fromUserId)) {
    throw new TaskInvalidUserIdError(fromUserId);
  }
  if (!mongoose.Types.ObjectId.isValid(toUserId)) {
    throw new TaskInvalidUserIdError(toUserId);
  }
  const filter = { userId: new mongoose.Types.ObjectId(fromUserId) };
  const update = {
    userId: new mongoose.Types.ObjectId(toUserId),
    updatedAt: new Date(),
  };
  const options = session ? { session } : {};
  const result = await TaskModel.updateMany(filter, { $set: update }, options);
  return { transferred: result.modifiedCount };
};