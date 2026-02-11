import { UniqueId } from "../base/id_generator";
import { TaskStatus, TaskPriority } from "../base/task_enums"

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
        userid,
        createdAt = new Date(), 
        updatedAt = new Date()
    }){
        this._validateTitle(title);
        this._validateStatue(status);
        this._validatePriority(priority);
        this._validateUserId(userid);
        if (dueDate != null) this._valdiateDueDate(dueDate);

        this._id = id;
        this._title= title;
        this._description= description;
        this._status= status ;
        this._priority= priority ;
        this._dueDate = dueDate ? new Date(dueDate): null;
        this._userid= userid; 
        this._createdAt = createdAt;
        this._updatedAt = updatedAt;

    }
    _validateTitle(title){
            if (!title || title.trim().length < 3) {throw new Error("Name required")};
    }
    _validateUserId(userid){
        if (!userid) {throw new Error("Task must belong to a user")};
    }
    _validateStatue(status){
        if (!Object.values(TaskStatus).includes(status)) {throw new Error("Invalid task status")}
    }
    _validatePriority(priority){
        if (!Object.values(TaskPriority).includes(priority)) {throw new Error("Invalid task priority")}
    }
    _valdiateDueDate(dueDate){
        const date = new Date(dueDate);
        if (isNaN(date.getTime())) {throw new Error("invalid due date")}
    }

    start(){
        if (this._status !== TaskStatus.PENDING){
            {throw new Error("Only pending tasks can start")}
        }
        this._status = TaskStatus.IN_PROGRESS
        this._updatedAt = new Date()
    }
    complete(){
        if (this._status !== TaskStatus.IN_PROGRESS) {throw Error('Only in progress task can be completed')}
        this._status = TaskStatus.COMPLETED
    }

    get id(){
        return this._id
    }
    get status(){
        return this._status
    }
    get priority(){
        return this._priority
    }
}