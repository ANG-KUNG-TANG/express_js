import mongoose from 'mongoose';
import { WritingStatus, TaskType, ExamType } from "../../domain/base/task_enums.js";
import { TaskSource, AssignmentStatus }      from "../../domain/base/task_enums.js";

const criterionSchema = new mongoose.Schema(
    {
        score:    { type: Number, min: 0, max: 9 },
        feedback: { type: String, trim: true },
    },
    { _id: false }
);

const aiEvaluationSchema = new mongoose.Schema(
    {
        bandScore:         { type: Number, min: 0, max: 9 },
        taskAchievement:   { type: criterionSchema },
        coherenceCohesion: { type: criterionSchema },
        lexicalResource:   { type: criterionSchema },
        grammaticalRange:  { type: criterionSchema },
        overallFeedback:   { type: String, trim: true },
        improvements:      [{ type: String, trim: true }],
        evaluatedAt:       { type: Date, default: Date.now },
    },
    { _id: false }
);

const WritingTaskSchema = new mongoose.Schema(
    {
        title: {
            type:      String,
            required:  true,
            trim:      true,
            minlength: 3,
            maxlength: 100,
        },
        description: {
            type:     String,
            required: false,
            trim:     true,
            default:  '',
        },
        status: {
            type:    String,
            enum:    Object.values(WritingStatus),
            default: WritingStatus.ASSIGNED,
        },
        taskType: {
            type:    String,
            enum:    Object.values(TaskType),
            required: true,
        },
        examType: {
            type:    String,
            enum:    Object.values(ExamType),
            required: true,
        },
        questionPrompt: {
            type:    String,
            trim:    true,
            default: '',
        },
        submissionText: {
            type:    String,
            default: '',
        },
        wordCount: {
            type:    Number,
            default: 0,
            min:     0,
        },
        bandScore: {
            type:    Number,
            default: null,
            min:     0,
            max:     9,
        },
        feedback: {
            type:    String,
            default: '',
        },
        submittedAt: {
            type:    Date,
            default: null,
        },
        reviewedAt: {
            type:    Date,
            default: null,
        },
        userId: {
            type:     mongoose.Schema.Types.ObjectId,
            ref:      'User',
            required: true,
        },
        source: {
            type:    String,
            enum:    Object.values(TaskSource),
            default: TaskSource.SELF,
        },
        assignedBy: {
            type:    mongoose.Schema.Types.ObjectId,
            ref:     'User',
            default: null,
        },
        assignedTo: {
            type:    mongoose.Schema.Types.ObjectId,
            ref:     'User',
            default: null,
        },
        assignmentStatus: {
            type:    String,
            enum:    [...Object.values(AssignmentStatus), null],
            default: null,
        },
        declineReason: {
            type:    String,
            default: null,
        },
        dueDate: {
            type:    Date,
            default: null,
        },
        reminderSentAt: {
            type:    Date,
            default: null,
        },
        unstartedNotiSentAt: {
            type:    Date,
            default: null,
        },
        aiEvaluation: {
            type:    aiEvaluationSchema,
            default: null,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// ── Compound Indexes for Fast Workflows ───────────────────────────────────────
WritingTaskSchema.index({ userId: 1, taskType: 1 });
WritingTaskSchema.index({ assignedBy: 1, createdAt: -1 });
WritingTaskSchema.index({ assignedTo: 1, createdAt: -1 });
WritingTaskSchema.index({ dueDate: 1, status: 1, assignmentStatus: 1 });
WritingTaskSchema.index({ assignmentStatus: 1, status: 1, createdAt: 1 });

const WritingTaskModel = mongoose.model('WritingTask', WritingTaskSchema);
export default WritingTaskModel;