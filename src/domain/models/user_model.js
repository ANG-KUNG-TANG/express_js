import mongoose from "mongoose"
import { UserRole } from "../../domain/base/user_enums.js"
import { NewsCategory } from "../base/new_enums.js";

const attachmentSchema = new mongoose.Schema(
    {
        originalName: { type: String, required: true },
        storedName:   { type: String, required: true },
        mimeType:     { type: String, required: true },
        size:         { type: Number, required: true },
        url:          { type: String, required: true },
    },
    { _id: true, timestamps: true }
);

const userSchema = new mongoose.Schema(
    {
        name: {
            type:      String,
            required:  true,
            trim:      true,
            minlength: 3,
            maxlength: 100
        },
        email: {
            type:      String,
            required:  true,
            unique:    true,
            lowercase: true,
            trim:      true,
            match:     /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        password: {
            type:      String,
            required:  true,
            minlength: 8
        },
        role: {
            type:    String,
            enum:    Object.values(UserRole),
            default: UserRole.USER
        },
        interests: {
            type:    [String],
            enum:    Object.values(NewsCategory),
            default: [],
            validate: {
                validator: (arr) => arr.length <= 5,
                message:   "you can select up to 5 interest categories",
            }
        },

        // ── Profile extras ──────────────────────────────────────────────
        avatarUrl:   { type: String, default: null },
        coverUrl:    { type: String, default: null },
        bio:         { type: String, default: '', maxlength: 300 },
        targetBand:  { type: String, default: null },
        examDate:    { type: Date,   default: null },
        attachments: { type: [attachmentSchema], default: [] },

        // ── Teacher assignment (new) ────────────────────────────────────
        // Populated by admin when linking a student to a teacher.
        // Used by teacher_assign_task.uc.js to verify ownership.
        assignedTeacher: {
            type:    mongoose.Schema.Types.ObjectId,
            ref:     'User',
            default: null,
        },
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Index for teacher → students lookup
userSchema.index({ assignedTeacher: 1, role: 1 });

const UserModel = mongoose.model('User', userSchema);

export default UserModel;