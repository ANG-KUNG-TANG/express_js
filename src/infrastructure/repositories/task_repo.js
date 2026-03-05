import WritingTaskModel from "../../domain/models/task_model.js";
import { WritingTask } from "../../domain/entities/task_entity.js";
import { WritingStatus } from "../../domain/base/task_enums.js";
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

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

const toDomain = (doc) => {
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
    });
};

const toDomainList = (docs) => docs.map(toDomain).filter((t) => t !== null);

const toPersistence = (task) => {
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
    };
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const findTaskByID = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new TaskInvalidIdError('invalid-id');
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

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    // it comes through options. Just spread filter directly.
    const query = { ...filter };

    if (status)   query.status   = status;
    if (taskType) query.taskType = taskType;
    if (examType) query.examType = examType;
    if (userId) {
        if (!mongoose.Types.ObjectId.isValid(userId)) throw new TaskInvalidUserIdError(userId);
        query.userId = new mongoose.Types.ObjectId(userId);
    }

    logger.debug('writingTaskRepo.findTasks', { query, skip, limit });
    const docs = await WritingTaskModel.find(query).skip(skip).limit(limit).sort(sort).lean();
    logger.debug('writingTaskRepo.findTasks: result', { count: docs.length });
    return toDomainList(docs);
};

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export const createTask = async (taskData) => {
    const task = new WritingTask(taskData);
    logger.debug('writingTaskRepo.createTask', { title: task._title, userId: task._userId });

    const existing = await WritingTaskModel.findOne({ title: task._title, userId: task._userId }).lean();
    if (existing) {
        logger.warn('writingTaskRepo.createTask: duplicate title for user', { title: task._title });
        throw new TaskDuplicateTitleError(task._title);
    }

    const persistence = toPersistence(task);
    try {
        const [doc] = await WritingTaskModel.create([persistence]);
        logger.debug('writingTaskRepo.createTask: saved', { id: doc._id });
        return toDomain(doc);
    } catch (err) {
        if (err.name === 'ValidationError') {
            const message = Object.values(err.errors).map((e) => e.message).join(', ');
            throw new TaskValidationError(message);
        }
        if (err.code === 11000) throw new TaskDuplicateTitleError(task._title);
        logger.error('writingTaskRepo.createTask: unexpected error', { error: err.message });
        throw err;
    }
};

export const updateTask = async (id, updates) => {
    // FIX #3: Pass the actual `id` value to TaskInvalidIdError, not the string literal 'TaskNotFoundError'
    if (!mongoose.Types.ObjectId.isValid(id)) throw new TaskInvalidIdError(id);
    logger.debug('writingTaskRepo.updateTask', { id, fields: Object.keys(updates) });

    const existing = await WritingTaskModel.findById(id);
    if (!existing) throw new TaskNotFoundError(id);

    const task = toDomain(existing);
    if (updates.title          !== undefined) { task._validateTitle(updates.title); task._title = updates.title; }
    if (updates.description    !== undefined) task._description    = updates.description;
    if (updates.status         !== undefined) task._status         = updates.status;
    if (updates.taskType       !== undefined) task._taskType       = updates.taskType;
    if (updates.examType       !== undefined) task._examType       = updates.examType;
    if (updates.questionPrompt !== undefined) task._questionPrompt = updates.questionPrompt;
    if (updates.submissionText !== undefined) task._submissionText = updates.submissionText;
    if (updates.wordCount      !== undefined) task._wordCount      = updates.wordCount;
    if (updates.bandScore      !== undefined) task._bandScore      = updates.bandScore;
    if (updates.feedback       !== undefined) task._feedback       = updates.feedback;
    if (updates.submittedAt    !== undefined) task._submittedAt    = updates.submittedAt;
    if (updates.reviewedAt     !== undefined) task._reviewedAt     = updates.reviewedAt;
    task._updatedAt = new Date();

    const doc = await WritingTaskModel.findByIdAndUpdate(
        id,
        { $set: {
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
            submittedAt:    task._submittedAt,
            reviewedAt:     task._reviewedAt,
            updatedAt:      task._updatedAt,
        }},
        { returnDocument: 'after', runValidators: true }
    ).lean();

    if (!doc) throw new TaskNotFoundError(id);
    logger.debug('writingTaskRepo.updateTask: updated', { id });
    return toDomain(doc);
};

export const deleteTask = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new TaskInvalidIdError(id);
    logger.debug('writingTaskRepo.deleteTask', { id });
    const result = await WritingTaskModel.findByIdAndDelete(id);
    if (!result) throw new TaskNotFoundError(id);
    logger.debug('writingTaskRepo.deleteTask: deleted', { id });
    return true;
};

export const countTasks = async (filters = {}) => {
    return await WritingTaskModel.countDocuments(filters);
};

// ---------------------------------------------------------------------------
// Status-transition helpers
// ---------------------------------------------------------------------------

export const startWritingTask = async (task) => {
    logger.debug('writingTaskRepo.startWritingTask', { id: task.id });

    task.startWriting();

    return await updateTask(task.id, { status: task._status });
};

export const submitTask = async (id, text) => {
    logger.debug('writingTaskRepo.submitTask', { id });
    const task = await findTaskByID(id);
    task.submit(text);
    return await updateTask(id, {
        status:         task._status,
        submissionText: task._submissionText,
        wordCount:      task._wordCount,
        submittedAt:    task._submittedAt,
    });
};

export const reviewTask = async (id, feedback) => {
    logger.debug('writingTaskRepo.reviewTask', { id });
    const task = await findTaskByID(id);
    task.review(feedback);
    return await updateTask(id, {
        status:     task._status,
        feedback:   task._feedback,
        reviewedAt: task._reviewedAt,
    });
};

export const scoreTask = async (id, bandScore) => {
    logger.debug('writingTaskRepo.scoreTask', { id });
    const task = await findTaskByID(id);
    task.score(bandScore);
    return await updateTask(id, {
        status:    task._status,
        bandScore: task._bandScore,
    });
};

// ---------------------------------------------------------------------------
// Convenience finders
// ---------------------------------------------------------------------------

export const findTaskByUser   = (userId, options = {}) => findTasks({}, { ...options, userId });
export const findTaskByStatus = (status, options = {}) => findTasks({ status }, options);
export const findTasksByType  = (taskType, options = {}) => findTasks({ taskType }, options);

export const searchTasksByTitle = async (searchTerm, options = {}) => {
    const { skip = 0, limit = 20, sort = { createdAt: -1 } } = options;
    logger.debug('writingTaskRepo.searchTasksByTitle', { searchTerm });
    const docs = await WritingTaskModel.find({ title: { $regex: searchTerm, $options: 'i' } })
        .skip(skip).limit(limit).sort(sort).lean();
    logger.debug('writingTaskRepo.searchTasksByTitle: result', { count: docs.length });
    return toDomainList(docs);
};

// ---------------------------------------------------------------------------
// Stats & ownership
// ---------------------------------------------------------------------------

export const getUserTaskStats = async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new TaskInvalidUserIdError(userId);
    logger.debug('writingTaskRepo.getUserTaskStats', { userId });
    const stats = await WritingTaskModel.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $facet: {
            total:      [{ $count: 'count' }],
            byStatus:   [{ $group: { _id: '$status',   count: { $sum: 1 } } }],
            byTaskType: [{ $group: { _id: '$taskType', count: { $sum: 1 } } }],
            byExamType: [{ $group: { _id: '$examType', count: { $sum: 1 } } }],
            avgBandScore: [
                { $match: { bandScore: { $ne: null } } },
                { $group: { _id: null, avg: { $avg: '$bandScore' } } },
            ],
        }},
    ]);
    const result = stats[0] || {};
    return {
        total:        result.total[0]?.count || 0,
        byStatus:     Object.fromEntries(result.byStatus?.map((s) => [s._id, s.count]) || []),
        byTaskType:   Object.fromEntries(result.byTaskType?.map((t) => [t._id, t.count]) || []),
        byExamType:   Object.fromEntries(result.byExamType?.map((e) => [e._id, e.count]) || []),
        avgBandScore: result.avgBandScore[0]?.avg ?? null,
    };
};

export const ensureTaskOwnership = (task, userId) => {
    if (task._userId.toString() !== userId.toString()) {
        logger.warn('writingTaskRepo.ensureTaskOwnership: ownership violation', { taskId: task.id, userId });
        throw new TaskOwnershipError(userId, task.id);
    }
};

// ---------------------------------------------------------------------------
// Transfers
// ---------------------------------------------------------------------------

export const transferTasks = async (fromUserId, toUserId, session = null) => {
    if (!mongoose.Types.ObjectId.isValid(fromUserId)) throw new TaskInvalidUserIdError(fromUserId);
    if (!mongoose.Types.ObjectId.isValid(toUserId))   throw new TaskInvalidUserIdError(toUserId);
    logger.debug('writingTaskRepo.transferTasks', { fromUserId, toUserId });
    const filter  = { userId: new mongoose.Types.ObjectId(fromUserId) };
    const update  = { userId: new mongoose.Types.ObjectId(toUserId), updatedAt: new Date() };
    const options = session ? { session } : {};
    const result  = await WritingTaskModel.updateMany(filter, { $set: update }, options);
    logger.debug('writingTaskRepo.transferTasks: done', { transferred: result.modifiedCount });
    return { transferred: result.modifiedCount };
};

export const transferSingleTask = async (taskId, fromUserId, toUserId, session = null) => {
    if (!mongoose.Types.ObjectId.isValid(taskId))     throw new TaskInvalidIdError(taskId);
    if (!mongoose.Types.ObjectId.isValid(fromUserId)) throw new TaskInvalidUserIdError(fromUserId);
    if (!mongoose.Types.ObjectId.isValid(toUserId))   throw new TaskInvalidUserIdError(toUserId);
    logger.debug('writingTaskRepo.transferSingleTask', { taskId, fromUserId, toUserId });
    const options = session ? { session } : {};
    const doc = await WritingTaskModel.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(taskId), userId: new mongoose.Types.ObjectId(fromUserId) },
        { $set: { userId: new mongoose.Types.ObjectId(toUserId), updatedAt: new Date() } },
        { returnDocument: 'after', runValidators: true, ...options }
    ).lean();
    if (!doc) throw new TaskNotFoundError(taskId);
    logger.debug('writingTaskRepo.transferSingleTask: transferred', { taskId });
    return toDomain(doc);
};

// ---------------------------------------------------------------------------
// Vocabulary lookup  (GET /api/vocab/:word)
// ---------------------------------------------------------------------------

/**
 * Look up a word using the Free Dictionary API.
 * Returns a normalised vocab entry so callers never need to know the
 * upstream shape.
 *
 * @param {string} word
 * @returns {Promise<{
 *   word: string,
 *   phonetic: string|null,
 *   audio: string|null,
 *   meanings: Array<{
 *     partOfSpeech: string,
 *     definitions: Array<{ definition: string, example: string|null, synonyms: string[], antonyms: string[] }>,
 *     synonyms: string[],
 *     antonyms: string[],
 *   }>,
 *   sourceUrls: string[],
 * }>}
 * @throws {TaskValidationError}  when the word param is blank
 * @throws {TaskNotFoundError}    when the dictionary has no entry for the word
 */
export const lookupVocab = async (word) => {
    if (!word || typeof word !== 'string' || !word.trim()) {
        throw new TaskValidationError('word is required');
    }

    const normalised = word.trim().toLowerCase();
    logger.debug('writingTaskRepo.lookupVocab', { word: normalised });

    const url      = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalised)}`;
    const response = await fetch(url);

    if (response.status === 404) {
        logger.warn('writingTaskRepo.lookupVocab: word not found', { word: normalised });
        throw new TaskNotFoundError(normalised);
    }

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        logger.error('writingTaskRepo.lookupVocab: upstream error', { status: response.status, text });
        throw new Error(`Dictionary API error: ${response.status}`);
    }

    const entries = await response.json();
    const entry   = entries[0];                     // use the primary entry

    // Flatten all phonetics to find the first non-empty text and audio URL
    const phonetic = entry.phonetic
        ?? entry.phonetics?.find((p) => p.text)?.text
        ?? null;

    const audio = entry.phonetics?.find((p) => p.audio)?.audio ?? null;

    const meanings = (entry.meanings ?? []).map((m) => ({
        partOfSpeech: m.partOfSpeech,
        definitions:  (m.definitions ?? []).map((d) => ({
            definition: d.definition,
            example:    d.example   ?? null,
            synonyms:   d.synonyms  ?? [],
            antonyms:   d.antonyms  ?? [],
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