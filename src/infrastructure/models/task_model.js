import mongoose from 'mongoose';
import { WritingStatus, TaskType, ExamType } from "../../domain/base/task_enums.js";
import { TaskSource, AssignmentStatus } from "../../domain/base/task_enums.js";

const WritingTaskSchema = new mongoose.Schema(
    {
        // ── Original fields (unchanged) ───────────────────────────────────────
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
            type:     String,
            enum:     Object.values(TaskType),
            required: true,
        },
        examType: {
            type:     String,
            enum:     Object.values(ExamType),
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

        // ── Assignment fields (new) ───────────────────────────────────────────

        // Which assignment mode created this task
        source: {
            type:    String,
            enum:    Object.values(TaskSource),
            default: TaskSource.SELF,
        },
        // Teacher who assigned it (null = self-created)
        assignedBy: {
            type:    mongoose.Schema.Types.ObjectId,
            ref:     'User',
            default: null,
        },
        // Student it was assigned to (mirrors userId for assigned tasks)
        assignedTo: {
            type:    mongoose.Schema.Types.ObjectId,
            ref:     'User',
            default: null,
        },
        // Student's response to the assignment
        assignmentStatus: {
            type:    String,
            enum:    [...Object.values(AssignmentStatus), null],
            default: null,
        },
        // Student's reason for declining (populated only when declined)
        declineReason: {
            type:    String,
            default: null,
        },
        // Teacher-set deadline
        dueDate: {
            type:    Date,
            default: null,
        },
        // De-dupe guards for cron jobs
        reminderSentAt: {
            type:    Date,
            default: null,
        },
        unstartedNotiSentAt: {
            type:    Date,
            default: null,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Original
WritingTaskSchema.index({ userId: 1, taskType: 1 });

// New — for assignment queries and cron job performance
WritingTaskSchema.index({ assignedBy: 1, createdAt: -1 });
WritingTaskSchema.index({ assignedTo: 1, createdAt: -1 });
WritingTaskSchema.index({ dueDate: 1, status: 1, assignmentStatus: 1 }); // findDueSoon
WritingTaskSchema.index({ assignmentStatus: 1, status: 1, createdAt: 1 }); // findUnstarted

const WritingTaskModel = mongoose.model('WritingTask', WritingTaskSchema);
export default WritingTaskModel;