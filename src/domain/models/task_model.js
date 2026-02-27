import mongoose from 'mongoose';
import { WritingStatus, TaskType, ExamType } from "../../domain/base/task_enums.js";

const WritingTaskSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 100,
        },
        description: {
            type: String,
            required: false,
            trim: true,
            default: '',
        },
        status: {
            type: String,
            enum: Object.values(WritingStatus),
            default: WritingStatus.ASSIGNED,
        },
        taskType: {
            type: String,
            enum: Object.values(TaskType),
            required: true,
        },
        examType: {
            type: String,
            enum: Object.values(ExamType),
            required: true,
        },
        questionPrompt: {
            type: String,
            trim: true,
            default: '',
        },
        submissionText: {
            type: String,
            default: '',
        },
        wordCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        bandScore: {
            type: Number,
            default: null,
            min: 0,
            max: 9,
        },
        feedback: {
            type: String,
            default: '',
        },
        submittedAt: {
            type: Date,
            default: null,
        },
        reviewedAt: {
            type: Date,
            default: null,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

WritingTaskSchema.index({ userId: 1, taskType: 1 });

const WritingTaskModel = mongoose.model('WritingTask', WritingTaskSchema);
export default WritingTaskModel;