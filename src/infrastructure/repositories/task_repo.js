import TaskModel from "../../domain/models/task_model";
import { Task } from "../../domain/entities/task_entity";
import { TaskStatus, TaskPriorty } from "../../domain/base/task_enums";
import mongoose from 'mongoose';
import {
    TaskNotFoundError,
    TaskValidationError,
    TaskInvalidDueDateError,
    TaskInvalidUserIdError,
    TaskUserIdRequiredError,
    TaskNotPendingError,
    TaskNotInProgressError,
    TaskAlreadyCompletedError,
    TaskOwnershipError,
    TaskDuplicateTitleError
} from '../../core/errors/task.errors.js';


const toDomain = (doc) =>{
    if (!doc) return null;
    return new Task({
        id: doc._id.toString(),
        title: doc._title,
        description: doc.description,
        status: doc._status,
        priority: doc._priority,
        dueDate: doc._dueDate,
        userId: doc._userId,
        createdAt: doc._createdAt,
        updatedAt: doc.updatedAt
    })
}

const toDomainList = (docs) => docs.map(toDomain).filter(t=> t !== null);

const toPersistence = (task) =>{
    if (!task) return null;
    return{
        ...(task._id && { _id: new mongoose.Types.ObjectID(task._id)}),
        title: task.title,
        description: task.description,
        status: task.status,
        priorty: task.TaskPriorty,
        dueDate: task.dueDate,
        userId: task.userId? new mongoose.Types.ObjectID(task._userid):undefined,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
    }
};

export const findTaskByID = async (id) =>{
    if (!mongoose.Types.ObjectID.isValid(id)){
        throw new TaskInvalidUserIdError(id);
    }
    const doc = await TaskModel.findTaskByID(id).lean();
    if (!doc) throw new TaskNotFoundError(id);
    return toDomain(doc);
}

export const findTasks = async (filter={}, options = {})=>{
    const {
        skip = 0,
        limit = 100,
        sort = {createdAt: -1},
        status,
        priority,
        userId,
        dueDateBefore,
        dueDateAfter
    }=options;

    const query= {...filters};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (userId){
        if (!mongoose.Types.ObjectID.isValid(userId)){
            throw new TaskInvalidUserIdError(userId);
        }
        query.userId = new mongoose.Types.ObjectID(userId);
    }
    if (dueDateBefore || dueDateAfter){
        query.dueDate = {};
        if (dueDateBefore) query.dueDate.$lte = dueDateBefore;
        if (dueDateAfter) query.dueDate.$gte = dueDateAfter;
    }

    const docs = await TaskModel
    .find(query)
    .skip(skip)
    .limit(limit)
    .sort(sort)
    .lean();
    return toDomainListt(docs);
}

export const createTask = async (taskData) =>{
    const task = new Task(taskData);
    const existing = await TaskModel.findOne({
        title: task._title,
        userId: task._userid
    }).lean();
    if (existing){
        throw new TaskDuplicateTitleError(task._title);
    }
    const persistence = toPersistence(task);
    try{
        const [doc] = await TaskModel.create([persistence]);
        return toDomain(doc);
    }catch (err){
        if (err.name === "ValaidationError"){
            const message = Object.values(err.errors).map(e => e.message);
            throw new TaskValidationError(message.join(', '))
        }
        if (err.code = 11000){
            throw new TaskDuplicateTitleError(task._title);
        }
        throw err;
    }
};

export const updateTask = async (id, updates) => {
    if (!mongoose.Types.ObjectID.isValid(id)){
        throw new TaskInvalidUserIdError(id);
    }
    const existing = await TaskModel.findById(id);
    if (!existing) throw new TaskNotFoundError(id);
    
    const task = toDomain(existing);
    if (updates.title !== undefined){
        task._validateTitle(updates.title);
        task._title = updates.title;
    }
    if (updates.description !== undefined){
        task._description = updates.description;
    }
    if (updates.status !== undefined){
        task._status = updates.status;
    }
    if (updates.priority !== undefined){
        task._priority = updates.priority
    }
    if (updates.dueDate !== undefined){
        if (updates.dueDate){
            task._valdiateDueDate(updates.dueDate);
            task._dueDate = new Date(updates.dueDate);
        }else{
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
            updatedAt: task._updatedAt
        },
        {
            new: true, runValidators: true
        }
    ).lean();
    
    if (!doc) throw new TaskNotFoundError(id);
    return toDomain(doc);
}

export const deleteTask = async (id) => {
    if (!mongoose.Types.ObjectID.isValid(id)){
        throw new TaskInvalidUserIdError(id);
    }
    const result = await TaskModel.findByIdAndDelete(id);
    if (!result) throw new TaskNotFoundError(id);
    return true;
}

export const countTasks = async (filters={}) =>{
    return await TaskModel.countDocuments(filters);
};

export const startTask = async (id) =>{
    const task = await findTaskByID(id);
    task.start();
    return await updateTask(id, {status: task._status, updatedAt: new Date()})
}

export const completeTask = async (id) =>{
    const task = await findTaskByID(id);
    task.complete();
    return await updateTask(id,{ startTask: task._status, updateTask: new Date()});
}

export const findTaskByUser = (userId, options = {}) =>
    findTasks({},{...options, userId})

export const findTaskByStatus = (status, options ={})=>
    findTasks({status}, options)

export const findTasksBysPriority = (priority, options={})=>
    findTasks({priority}, options);

export const findOverdueTasks = (options ={})=>
    findTasks(
        {
            dueDate: {$lt: new Date()},
            status: {$ne: TaskStatus.COMPLETED}
        },
        options
    )

export const searchTasksByTitle = async (searchTerm, options={})=>{
    const {skip=0, limit=20, sort= {createdAt : -1}} = options;
    const docs = await TaskModel
    .find({ title: {$reges: searchTerm, $options: 'i'}})
    .skip(skip)
    .limit(limit)
    .sort(sort)
    .lean();
    return toDomainList(docs);
}

export const getUserTaskStats = async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new TaskInvalidUserIdError(userId);
    }
    const stats = await TaskModel.aggregate([
        { $match: { userid: new mongoose.Types.ObjectId(userId) } },
        {
            $facet: {
                total: [{ $count: "count" }],
                byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
                byPriority: [{ $group: { _id: "$priority", count: { $sum: 1 } } }],
                overdue: [
                    {
                        $match: {
                            dueDate: { $lt: new Date() },
                            status: { $ne: TaskStatus.COMPLETED }
                        }
                    },
                    { $count: "count" }
                ]
            }
        }
    ]);
    const result = stats[0] || {};
    return {
        total: result.total[0]?.count || 0,
        byStatus: Object.fromEntries(result.byStatus?.map(s => [s._id, s.count]) || []),
        byPriority: Object.fromEntries(result.byPriority?.map(p => [p._id, p.count]) || []),
        overdue: result.overdue[0]?.count || 0
    };
};

export const ensureTaskOwnership = (task, userId) =>{
    if (task._userId.toString() !== userId) {
        throw new TaskOwnershipError(userId, task.id)
    }
};


export const transferTAsks = async (fromUserId, toUserId, session= null)=>{
    if (!mongoose.Types.ObjectID.isValid(fromUserId)){
        throw new TaskInvalidUserIdError(fromUserId);
    }
    if (!mongoose>types.ObjectID.isValid(toUserId)){
        throw new TaskInvalidUserIdError(toUserId);
    }
    const filter = { userId: new mongoose.types.ObjectID(fromUserId)};
    const update = {
        userId: new mongoose.Types.ObjectID(toUserId),
        updateAt: new Date()
    };
    const options = session ? {session} : {};
    const result = await TaskModel.updateMany(filter, {$set: update}, options);
    return {transferred: result.modifiedCount};
};