// src/infrastructure/repositories/task_repo.js

import WritingTaskModel from "../models/task_model.js";
import { WritingTask }  from "../../domain/entities/task_entity.js";
import { WritingStatus, TaskType, ExamType, TaskSource, AssignmentStatus } from "../../domain/base/task_enums.js";
import { AiEvaluation } from "../../domain/entities/ai_evaluate_entity.js";
import mongoose from 'mongoose';
import {
    TaskInvalidIdError,
    TaskInvalidUserIdError,
    TaskNotFoundError,
    TaskDuplicateTitleError,
    TaskValidationError,
    TaskOwnershipError,
} from '../../core/errors/task.errors.js';
import logger from '../../core/logger/logger.js';

// =============================================================================
// Inline Mapping Helpers  (private to this module — not exported)
//
// toDomain      — lean Mongoose doc  →  WritingTask domain entity
// toDomainList  — array of lean docs →  array of entities
// toDoc         — WritingTask entity →  plain object for Mongoose writes
//
// Keeping them here means one file owns the full persistence contract.
// If the schema gains a new field you update toDomain + toDoc and you're done.
// =============================================================================

/**
 * Convert a raw lean Mongoose document into a WritingTask domain entity.
 * Always uses `new WritingTask(props)` — the entity constructor handles
 * re-hydration the same way it handles creation (all fields optional-defaulted).
 */
const toDomain = (doc) => {
    if (!doc) return null;
    return new WritingTask({
        id:                  doc._id.toString(),
        title:               doc.title,
        description:         doc.description          ?? '',
        status:              doc.status               ?? WritingStatus.ASSIGNED,
        taskType:            doc.taskType,
        examType:            doc.examType,
        questionPrompt:      doc.questionPrompt        ?? '',
        submissionText:      doc.submissionText        ?? '',
        wordCount:           doc.wordCount             ?? 0,
        bandScore:           doc.bandScore             ?? null,
        feedback:            doc.feedback              ?? '',
        userId:              doc.userId?.toString(),
        submittedAt:         doc.submittedAt           ?? null,
        reviewedAt:          doc.reviewedAt            ?? null,
        createdAt:           doc.createdAt,
        updatedAt:           doc.updatedAt,
        // Assignment fields
        source:              doc.source               ?? TaskSource.SELF,
        assignedBy:          doc.assignedBy?.toString()  ?? null,
        assignedTo:          doc.assignedTo?.toString()  ?? null,
        assignmentStatus:    doc.assignmentStatus      ?? null,
        declineReason:       doc.declineReason         ?? null,
        dueDate:             doc.dueDate               ?? null,
        reminderSentAt:      doc.reminderSentAt        ?? null,
        unstartedNotiSentAt: doc.unstartedNotiSentAt   ?? null,
        // Nested AI evaluation — entity constructor handles raw object → AiEvaluation
        aiEvaluation:        doc.aiEvaluation          ?? null,
    });
};

/** Map an array of lean docs — filters out any null/undefined entries. */
const toDomainList = (docs) => docs.map(toDomain).filter(Boolean);

/**
 * Convert a WritingTask entity into a plain object for Mongoose writes.
 * Reads exclusively through public getters — never accesses # fields directly.
 */
const toDoc = (entity) => ({
    title:               entity.title,
    description:         entity.description,
    status:              entity.status,
    taskType:            entity.taskType,
    examType:            entity.examType,
    questionPrompt:      entity.questionPrompt,
    submissionText:      entity.submissionText,
    wordCount:           entity.wordCount,
    bandScore:           entity.bandScore,
    feedback:            entity.feedback,
    userId:              entity.userId,
    submittedAt:         entity.submittedAt,
    reviewedAt:          entity.reviewedAt,
    updatedAt:           entity.updatedAt,
    // Assignment fields
    source:              entity.source,
    assignedBy:          entity.assignedBy,
    assignedTo:          entity.assignedTo,
    assignmentStatus:    entity.assignmentStatus,
    declineReason:       entity.declineReason,
    dueDate:             entity.dueDate,
    reminderSentAt:      entity.reminderSentAt,
    unstartedNotiSentAt: entity.unstartedNotiSentAt,
    // Serialize nested AiEvaluation class → plain object
    aiEvaluation:        entity.aiEvaluation?.toJSON?.() ?? null,
});

const ALLOWED_SORT_FIELDS = new Set(['createdAt', 'updatedAt', 'title', 'bandScore', 'submittedAt', 'dueDate']);
const ALLOWED_SORT_DIRS   = new Set([1, -1, 'asc', 'desc']);
const DEFAULT_SORT        = { createdAt: -1 };

const sanitizeSort = (raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return DEFAULT_SORT;
    const safe = {};
    for (const [field, dir] of Object.entries(raw)) {
        if (!ALLOWED_SORT_FIELDS.has(field)) {
            logger.warn('writingTaskRepo: disallowed sort field ignored', { field });
            continue;
        }
        if (!ALLOWED_SORT_DIRS.has(dir)) {
            logger.warn('writingTaskRepo: disallowed sort direction ignored', { field, dir });
            continue;
        }
        safe[field] = dir;
    }
    return Object.keys(safe).length ? safe : DEFAULT_SORT;
};
// =============================================================================
// Guard helper — DRY ObjectId validation
// =============================================================================

const assertValidId     = (id)     => { if (!mongoose.Types.ObjectId.isValid(id))     throw new TaskInvalidIdError(id); };
const assertValidUserId = (userId) => { if (!mongoose.Types.ObjectId.isValid(userId)) throw new TaskInvalidUserIdError(userId); };

// =============================================================================
// updateTask — callback pattern (same approach as user_repo)
//
// `mutate` receives the current entity and calls domain methods on it.
// The repo then persists whatever state the entity holds afterward.
// The repo NEVER accesses # fields directly.
//
// Example:
//   await updateTask(id, (t) => t.submit(text));
//   await updateTask(id, (t) => t.review(feedback));
//   await updateTask(id, (t) => t.score(band));
// =============================================================================

const _updateTask = async (id, mutate) => {
    assertValidId(id);

    const doc = await WritingTaskModel.findById(id).lean();
    if (!doc) throw new TaskNotFoundError(id);

    const task = toDomain(doc);
    mutate(task);                          // ← caller applies domain method(s)

    const updated = await WritingTaskModel.findByIdAndUpdate(
        id,
        { $set: toDoc(task) },
        { returnDocument: 'after', runValidators: true }
    ).lean();

    if (!updated) throw new TaskNotFoundError(id);
    return toDomain(updated);
};

// =============================================================================
// Queries
// =============================================================================

export const findTaskByID = async (id) => {
    assertValidId(id);
    logger.debug('writingTaskRepo.findTaskByID', { id });
    const doc = await WritingTaskModel.findById(id).lean();
    if (!doc) throw new TaskNotFoundError(id);
    return toDomain(doc);
};

export const findTasks = async (filter = {}, options = {}) => {
    const {
        page = 1,
        limit = 20,
        sort = { createdAt: -1 },
        status,
        taskType,
        examType,
        userId,
    } = options;

    const skip  = (Math.max(1, Number(page)) - 1) * Number(limit);
    const query = { ...filter };

    if (status)   query.status   = status;
    if (taskType) query.taskType = taskType;
    if (examType) query.examType = examType;
    if (userId) {
        assertValidUserId(userId);
        query.userId = new mongoose.Types.ObjectId(userId);
    }

    logger.debug('writingTaskRepo.findTasks', { query, skip, limit });
    const docs = await WritingTaskModel.find(query).skip(skip).limit(Number(limit)).sort(sort).lean();
    logger.debug('writingTaskRepo.findTasks: result', { count: docs.length });
    return toDomainList(docs);
};

export const countTasks = async (filters = {}) => WritingTaskModel.countDocuments(filters);

// =============================================================================
// Writes
// =============================================================================

/**
 * createTask(taskData)
 * taskData can be a ready WritingTask entity or a raw props object.
 * Checks for duplicate title per user before persisting.
 */
export const createTask = async (taskData) => {
    const task = taskData instanceof WritingTask ? taskData : new WritingTask(taskData);
    logger.debug('writingTaskRepo.createTask', { title: task.title, userId: task.userId });

    const existing = await WritingTaskModel.findOne({ title: task.title, userId: task.userId }).lean();
    if (existing) {
        logger.warn('writingTaskRepo.createTask: duplicate title', { title: task.title });
        throw new TaskDuplicateTitleError(task.title);
    }

    try {
        const [doc] = await WritingTaskModel.create([toDoc(task)]);
        logger.debug('writingTaskRepo.createTask: saved', { id: doc._id });
        return toDomain(doc);
    } catch (err) {
        if (err.name === 'ValidationError') {
            throw new TaskValidationError(Object.values(err.errors).map((e) => e.message).join(', '));
        }
        if (err.code === 11000) throw new TaskDuplicateTitleError(task.title);
        logger.error('writingTaskRepo.createTask: unexpected error', { error: err.message });
        throw err;
    }
};

export const createManyTasks = async (payloads) => {
    if (!payloads?.length) return [];
    logger.debug('taskRepo.createManyTasks', { count: payloads.length });

    const docs = payloads.map((p) => toDoc(p instanceof WritingTask ? p : new WritingTask(p)));
    const inserted = await WritingTaskModel.insertMany(docs, { ordered: false });

    logger.debug('taskRepo.createManyTasks: inserted', { count: inserted.length });
    return inserted.map((d) => toDomain(d.toObject ? d.toObject() : d));
};

export const deleteTask = async (id) => {
    assertValidId(id);
    logger.debug('writingTaskRepo.deleteTask', { id });
    const result = await WritingTaskModel.findByIdAndDelete(id);
    if (!result) throw new TaskNotFoundError(id);
    logger.debug('writingTaskRepo.deleteTask: deleted', { id });
    return true;
};

// =============================================================================
// Status-transition methods
// Each one loads the entity, calls the right domain method, then persists.
// =============================================================================

export const startWritingTask = async (id) => {
    logger.debug('writingTaskRepo.startWritingTask', { id });
    return _updateTask(id, (t) => t.startWriting());
};

export const submitTask = async (id, text) => {
    logger.debug('writingTaskRepo.submitTask', { id });
    return _updateTask(id, (t) => t.submit(text));
};

export const reviewTask = async (id, feedback) => {
    logger.debug('writingTaskRepo.reviewTask', { id });
    return _updateTask(id, (t) => t.review(feedback));
};

export const scoreTask = async (id, bandScore) => {
    logger.debug('writingTaskRepo.scoreTask', { id });
    return _updateTask(id, (t) => t.score(bandScore));
};

export const acceptAssignment = async (taskId) => {
    logger.debug('writingTaskRepo.acceptAssignment', { taskId });
    return _updateTask(taskId, (t) => t.acceptAssignment());
};

export const declineAssignment = async (taskId, reason) => {
    logger.debug('writingTaskRepo.declineAssignment', { taskId });
    return _updateTask(taskId, (t) => t.declineAssignment(reason));
};

// =============================================================================
// AI Evaluation
// =============================================================================

/**
 * saveAiEvaluation(taskId, evaluation)
 *
 * Uses a targeted $set on the aiEvaluation subdoc only — teacher's
 * bandScore and feedback fields are NEVER touched by this operation.
 */
export const saveAiEvaluation = async (taskId, evaluation) => {
    assertValidId(taskId);
    logger.debug('writingTaskRepo.saveAiEvaluation', { taskId, bandScore: evaluation.bandScore });

    const doc = await WritingTaskModel.findByIdAndUpdate(
        taskId,
        {
            $set: {
                aiEvaluation: evaluation.toJSON ? evaluation.toJSON() : evaluation,
                updatedAt:    new Date(),
            },
        },
        { returnDocument: 'after', runValidators: true }
    ).lean();

    if (!doc) throw new TaskNotFoundError(taskId);
    logger.debug('writingTaskRepo.saveAiEvaluation: saved', { taskId });
    return toDomain(doc);
};

// =============================================================================
// Cron helpers
// =============================================================================

export const findDueSoon = async (withinHours = 24) => {
    const now    = new Date();
    const cutoff = new Date(now.getTime() + withinHours * 60 * 60 * 1000);
    const dedupe = new Date(now.getTime() - 20 * 60 * 60 * 1000);

    logger.debug('writingTaskRepo.findDueSoon', { withinHours, cutoff });
    const docs = await WritingTaskModel.find({
        dueDate:          { $gt: now, $lte: cutoff },
        status:           { $nin: [WritingStatus.SUBMITTED, WritingStatus.REVIEWED, WritingStatus.SCORED] },
        assignmentStatus: AssignmentStatus.ACCEPTED,
        $or: [
            { reminderSentAt: null },
            { reminderSentAt: { $lte: dedupe } },
        ],
    }).lean();
    logger.debug('writingTaskRepo.findDueSoon: result', { count: docs.length });
    return toDomainList(docs);
};

export const findUnstarted = async (afterDays = 3) => {
    const staleCutoff = new Date();
    staleCutoff.setDate(staleCutoff.getDate() - afterDays);
    const dedupe = new Date(Date.now() - 24 * 60 * 60 * 1000);

    logger.debug('writingTaskRepo.findUnstarted', { afterDays, staleCutoff });
    const docs = await WritingTaskModel.find({
        assignmentStatus: AssignmentStatus.ACCEPTED,
        status:           WritingStatus.ASSIGNED,
        createdAt:        { $lte: staleCutoff },
        $or: [
            { unstartedNotiSentAt: null },
            { unstartedNotiSentAt: { $lte: dedupe } },
        ],
    }).lean();
    logger.debug('writingTaskRepo.findUnstarted: result', { count: docs.length });
    return toDomainList(docs);
};

export const markReminderSent = async (taskId) => {
    assertValidId(taskId);
    logger.debug('writingTaskRepo.markReminderSent', { taskId });
    await WritingTaskModel.findByIdAndUpdate(taskId, {
        $set: { reminderSentAt: new Date(), updatedAt: new Date() },
    });
};

export const markUnstartedNotiSent = async (taskId) => {
    assertValidId(taskId);
    logger.debug('writingTaskRepo.markUnstartedNotiSent', { taskId });
    await WritingTaskModel.findByIdAndUpdate(taskId, {
        $set: { unstartedNotiSentAt: new Date(), updatedAt: new Date() },
    });
};

// =============================================================================
// Teacher / student finders
// =============================================================================

export const findByAssignedBy = async (teacherId, filter = {}, options = {}) => {
    assertValidUserId(teacherId);
    const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    logger.debug('writingTaskRepo.findByAssignedBy', { teacherId });
    const docs = await WritingTaskModel.find({
        assignedBy: new mongoose.Types.ObjectId(teacherId),
        ...filter,
    }).skip(skip).limit(Number(limit)).sort(sort).lean();
    return toDomainList(docs);
};

export const findByAssignedTo = async (studentId, filter = {}, options = {}) => {
    assertValidId(studentId);
    const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    logger.debug('writingTaskRepo.findByAssignedTo', { studentId });
    const docs = await WritingTaskModel.find({
        assignedTo: new mongoose.Types.ObjectId(studentId),
        ...filter,
    }).skip(skip).limit(Number(limit)).sort(sort).lean();
    return toDomainList(docs);
};

// =============================================================================
// Convenience finders (thin wrappers around findTasks)
// =============================================================================

export const findTaskByUser   = (userId,   options = {}) => findTasks({},          { ...options, userId });
export const findTaskByStatus = (status,   options = {}) => findTasks({ status },  options);
export const findTasksByType  = (taskType, options = {}) => findTasks({ taskType }, options);

export const searchTasksByTitle = async (searchTerm, options = {}) => {
    const { skip = 0, limit = 20, sort = { createdAt: -1 }, userId } = options;
    logger.debug('writingTaskRepo.searchTasksByTitle', { searchTerm, userId });
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query = { title: { $regex: escaped, $options: 'i' } };
    if (userId) {
        assertValidUserId(userId);
        query.userId = new mongoose.Types.ObjectId(userId);
    }
    const docs = await WritingTaskModel
        .find(query)
        .skip(skip).limit(limit).sort(sort).lean();
    logger.debug('writingTaskRepo.searchTasksByTitle: result', { count: docs.length });
    return toDomainList(docs);
};

// =============================================================================
// Stats & ownership
// =============================================================================

export const getUserTaskStats = async (userId) => {
    assertValidUserId(userId);
    logger.debug('writingTaskRepo.getUserTaskStats', { userId });

    const [result = {}] = await WritingTaskModel.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
            $facet: {
                total:        [{ $count: 'count' }],
                byStatus:     [{ $group: { _id: '$status',   count: { $sum: 1 } } }],
                byTaskType:   [{ $group: { _id: '$taskType', count: { $sum: 1 } } }],
                byExamType:   [{ $group: { _id: '$examType', count: { $sum: 1 } } }],
                avgBandScore: [
                    { $match: { bandScore: { $ne: null } } },
                    { $group: { _id: null, avg: { $avg: '$bandScore' } } },
                ],
            },
        },
    ]);

    return {
        total:        result.total?.[0]?.count       ?? 0,
        byStatus:     Object.fromEntries(result.byStatus?.map((s) => [s._id, s.count])   ?? []),
        byTaskType:   Object.fromEntries(result.byTaskType?.map((t) => [t._id, t.count]) ?? []),
        byExamType:   Object.fromEntries(result.byExamType?.map((e) => [e._id, e.count]) ?? []),
        avgBandScore: result.avgBandScore?.[0]?.avg  ?? null,
    };
};

/**
 * ensureTaskOwnership(task, userId)
 * Throws TaskOwnershipError if the task doesn't belong to the given user.
 * Reads through the public getter — never touches # fields.
 */
export const ensureTaskOwnership = (task, userId) => {
    if (task.userId.toString() !== userId.toString()) {
        logger.warn('writingTaskRepo.ensureTaskOwnership: violation', { taskId: task.id, userId });
        throw new TaskOwnershipError(userId, task.id);
    }
};

// =============================================================================
// Transfers
// =============================================================================

export const transferTasks = async (fromUserId, toUserId, session = null) => {
    assertValidUserId(fromUserId);
    assertValidUserId(toUserId);
    logger.debug('writingTaskRepo.transferTasks', { fromUserId, toUserId });

    const result = await WritingTaskModel.updateMany(
        { userId: new mongoose.Types.ObjectId(fromUserId) },
        { $set: { userId: new mongoose.Types.ObjectId(toUserId), updatedAt: new Date() } },
        session ? { session } : {}
    );
    logger.debug('writingTaskRepo.transferTasks: done', { transferred: result.modifiedCount });
    return { transferred: result.modifiedCount };
};

export const transferSingleTask = async (taskId, fromUserId, toUserId, session = null) => {
    assertValidId(taskId);
    assertValidUserId(fromUserId);
    assertValidUserId(toUserId);
    logger.debug('writingTaskRepo.transferSingleTask', { taskId, fromUserId, toUserId });

    const doc = await WritingTaskModel.findOneAndUpdate(
        {
            _id:    new mongoose.Types.ObjectId(taskId),
            userId: new mongoose.Types.ObjectId(fromUserId),
        },
        { $set: { userId: new mongoose.Types.ObjectId(toUserId), updatedAt: new Date() } },
        { returnDocument: 'after', runValidators: true, ...(session ? { session } : {}) }
    ).lean();

    if (!doc) throw new TaskNotFoundError(taskId);
    logger.debug('writingTaskRepo.transferSingleTask: transferred', { taskId });
    return toDomain(doc);
};

// =============================================================================
// Vocabulary lookup  (external API — belongs here as an infra concern)
// =============================================================================

export const lookupVocab = async (word) => {
    if (!word || typeof word !== 'string' || !word.trim()) {
        throw new TaskValidationError('word is required');
    }

    const normalised = word.trim().toLowerCase();
    logger.debug('writingTaskRepo.lookupVocab', { word: normalised });

    const url      = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalised)}`;
    const response = await fetch(url);

    if (response.status === 404) {
        logger.warn('writingTaskRepo.lookupVocab: not found', { word: normalised });
        throw new TaskNotFoundError(normalised);
    }
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        logger.error('writingTaskRepo.lookupVocab: upstream error', { status: response.status, text });
        throw new Error(`Dictionary API error: ${response.status}`);
    }

    const entries  = await response.json();
    const entry    = entries[0];
    const phonetic = entry.phonetic ?? entry.phonetics?.find((p) => p.text)?.text ?? null;
    const audio    = entry.phonetics?.find((p) => p.audio)?.audio ?? null;

    const meanings = (entry.meanings ?? []).map((m) => ({
        partOfSpeech: m.partOfSpeech,
        definitions:  (m.definitions ?? []).map((d) => ({
            definition: d.definition,
            example:    d.example  ?? null,
            synonyms:   d.synonyms ?? [],
            antonyms:   d.antonyms ?? [],
        })),
        synonyms: m.synonyms ?? [],
        antonyms: m.antonyms ?? [],
    }));

    logger.debug('writingTaskRepo.lookupVocab: found', { word: entry.word, meanings: meanings.length });
    return {
        word:       entry.word,
        phonetic,
        audio,
        meanings,
        sourceUrls: entry.sourceUrls ?? [],
    };
};

export const updateTask = async (id, mutate) => {
    return _updateTask(id, mutate);
};