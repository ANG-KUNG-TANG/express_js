import { UniqueId } from "../base/id_generator";
import { TaskStatus, TaskPriority } from "../base/task_enums"

export class Task{
    constructor(props){
        this._initilize(props)
    }
    _initilize({
        id, 
        title,
        description, 
        status, 
        priority, 
        dueDate, 
        userid,
        createdAt = new Date(), 
        updatedAt = new Date()
    }){
        if (!title || title.length < 3) throw new Error("Name required");
        if (!userid) throw new Error("Task must belong to a user");
        if (!status) throw new Error('Invalid task status');
        if (!status) throw new Error('Invalid taskpriority')
        this._id = id ?? UniqueId.generator()
        this._title= title
        this._description= description
        this._status= status 
        this._priority= priority 
        this._dueDate = dueDate
        this._userid= userid
        this._createdAt = createdAt
        this._updatedAt = updatedAt

    }
    start(){
        if (this._status !== TaskStatus.PENDING){
            throw new Error("Only pending tasks can start")
        }
        this._status = TaskStatus.IN_PROGRESS
        this._updatedAt = new Date()
    }
    complete(){
        if (this._status !== TaskStatus.IN_PROGRESS) throw Error('Only in progress task can be completed')
        this._status = TaskStatus.COMPLETED
    }
    get id(){
        return this._id
    }
    get status(){
        return this._status
    }
}