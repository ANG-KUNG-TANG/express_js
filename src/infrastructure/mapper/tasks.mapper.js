import mongoose from 'mongoose'
import { WritingTask } from "../../domain/entities/task_entity.js";

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

export const toDomain = (doc) => {
    if (!doc) return null;
    return new WritingTask({
        id:             doc._id.toString(),
        title:          doc.title,
        description:    doc.description,
        status:         doc.status,
        taskType:       doc.taskType,
        examType:       doc.examType,
        questionPrompt: doc.questionPrompt,
        submissionText: doc.submissionText,
        wordCount:      doc.wordCount,
        bandScore:      doc.bandScore,
        feedback:       doc.feedback,
        userId:         doc.userId ? doc.userId.toString() : undefined,
        submittedAt:    doc.submittedAt,
        reviewedAt:     doc.reviewedAt,
        createdAt:      doc.createdAt,
        updatedAt:      doc.updatedAt,
        source:              doc.source             ?? undefined,
        assignedBy:          doc.assignedBy         ? doc.assignedBy.toString()  : null,
        assignedTo:          doc.assignedTo         ? doc.assignedTo.toString()  : null,
        assignmentStatus:    doc.assignmentStatus   ?? null,
        declineReason:       doc.declineReason      ?? null,
        dueDate:             doc.dueDate            ?? null,
        reminderSentAt:      doc.reminderSentAt     ?? null,
        unstartedNotiSentAt: doc.unstartedNotiSentAt ?? null,
    });
};

export const toDomainList = (docs) => docs.map(toDomain).filter((t) => t !== null);

export const toPersistence = (task) => {
    if (!task) return null;
    return {
        ...(task._id && mongoose.Types.ObjectId.isValid(task._id) && {
            _id: new mongoose.Types.ObjectId(task._id),
        }),
        title:          task._title,
        description:    task._description,
        status:         task._status,
        taskType:       task._taskType,
        examType:       task._examType,
        questionPrompt: task._questionPrompt,
        submissionText: task._submissionText,
        wordCount:      task._wordCount,
        bandScore:      task._bandScore,
        feedback:       task._feedback,
        userId:         task._userId ? new mongoose.Types.ObjectId(task._userId) : undefined,
        submittedAt:    task._submittedAt,
        reviewedAt:     task._reviewedAt,
        createdAt:      task._createdAt,
        updatedAt:      task._updatedAt,
        source:              task._source,
        assignedBy:          task._assignedBy  ? new mongoose.Types.ObjectId(task._assignedBy)  : null,
        assignedTo:          task._assignedTo  ? new mongoose.Types.ObjectId(task._assignedTo)  : null,
        assignmentStatus:    task._assignmentStatus  ?? null,
        declineReason:       task._declineReason     ?? null,
        dueDate:             task._dueDate            ?? null,
        reminderSentAt:      task._reminderSentAt     ?? null,
        unstartedNotiSentAt: task._unstartedNotiSentAt ?? null,
    };
};
