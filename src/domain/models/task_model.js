import mongoose from 'mongoose';
import { TaskStatus, TaskPriority} from './base/task_enums'

const TaskSchema = new mongoose.Schema(
    {
        title:{
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 100
        },
        description:{
            type: String,
            required: false,
            trim: true,
            default: ''
        },
        status:{
            type: String,
            enum: Object.values(TaskStatus),
            default: TaskStatus.PENDING            
        },
        priority:{
            type: String,
            enum: Object.values(TaskPriority),
            default: TaskPriority.MEDIUM
        },
        dueDate:{
            type:Date,
            required: false
        },
        userid:{
            type: mongoose.Schema.Types.ObjectId,
            ref:'User',
            required: true
        }
    },
    {
        timestamps: true,
        versionKey:false
    }
);

TaskSchema.index({userid: 1, status: 1});

const TaskModel = mongoose.model('Task', TaskSchema);
export default TaskModel;