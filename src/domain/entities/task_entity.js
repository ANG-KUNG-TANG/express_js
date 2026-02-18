import { UniqueId } from "../base/id_generator.js";
import { TaskStatus, TaskPriority } from "../base/task_enums.js"

export class Task{
    constructor(props){
        this._initialize(props)
    }
    _initialize({
        id, 
        title,
        description ="", 
        status = TaskStatus.PENDING, 
        priority = TaskPriority.MEDIUM, 
        dueDate, 
        userId,
        createdAt = new Date(), 
        updatedAt = new Date()
    }){
        this._validateTitle(title);
        this._validateStatus(status);
        this._validatePriority(priority);
        this._validateUserId(userId);
        if (dueDate != null) this._validateDueDate(dueDate);

        this._id = id || new UniqueId().generator();
        this._title= title;
        this._description= description;
        this._status= status ;
        this._priority= priority ;
        this._dueDate = dueDate ? new Date(dueDate): null;
        this._userId= userId; 
        this._createdAt = createdAt;
        this._updatedAt = updatedAt;

    }
    _validateTitle(title){
            if (!title || title.trim().length < 3) {throw new Error("Title must be at least 3 characters long")};
    }
    _validateUserId(userId){
        if (!userId) {throw new Error("Task must belong to a user")};
    }
    _validateStatus(status){
        if (!Object.values(TaskStatus).includes(status)) {throw new Error("Invalid task status")}
    }
    _validatePriority(priority){
        if (!Object.values(TaskPriority).includes(priority)) {throw new Error("Invalid task priority")}
    }
    _validateDueDate(dueDate){
        const date = new Date(dueDate);
        if (isNaN(date.getTime())) {throw new Error("invalid due date")}
    }

    start(){
        if (this._status !== TaskStatus.PENDING){
            {throw new Error("Only pending tasks can start")}
        }
        this._status = TaskStatus.IN_PROGRESS
        this._updatedAt = new Date();
    }
    complete(){
        if (this._status !== TaskStatus.IN_PROGRESS) {throw Error('Only in-progress tasks can be completed')}
        this._status = TaskStatus.COMPLETED
    }

    get id(){
        return this._id;
    }
    get status(){
        return this._status;
    }
    get priority(){
        return this._priority;
    }
}