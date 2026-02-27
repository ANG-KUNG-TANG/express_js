import { UniqueId } from "../base/id_generator.js";
import { WritingStatus, TaskType, ExamType } from "../base/task_enums.js";

export class WritingTask {
    constructor(props) {
        this._initialize(props);
    }

    _initialize({
        id,
        title,
        description = "",
        status = WritingStatus.ASSIGNED,
        taskType,
        examType,
        questionPrompt,
        submissionText = "",
        wordCount = 0,
        bandScore = null,
        feedback = "",
        userId,
        submittedAt = null,
        reviewedAt = null,
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        this._validateTitle(title);
        this._validateStatus(status);
        this._validateTaskType(taskType);
        this._validateExamType(examType);
        this._validateUserId(userId);
        if (bandScore !== null && bandScore !== undefined) this._validateBandScore(bandScore);

        this._id             = id || new UniqueId().generator();
        this._title          = title;
        this._description    = description;
        this._status         = status;
        this._taskType       = taskType;
        this._examType       = examType;
        this._questionPrompt = questionPrompt || "";
        this._submissionText = submissionText;
        this._wordCount      = wordCount;
        this._bandScore      = bandScore;
        this._feedback       = feedback;
        this._userId         = userId;
        this._submittedAt    = submittedAt ? new Date(submittedAt) : null;
        this._reviewedAt     = reviewedAt  ? new Date(reviewedAt)  : null;
        this._createdAt      = createdAt;
        this._updatedAt      = updatedAt;
    }

    // -------------------------------------------------------------------------
    // Validators
    // -------------------------------------------------------------------------

    _validateTitle(title) {
        if (!title || title.trim().length < 3) {
            throw new Error("Title must be at least 3 characters long");
        }
    }

    _validateUserId(userId) {
        if (!userId) throw new Error("WritingTask must belong to a user");
    }

    _validateStatus(status) {
        if (!Object.values(WritingStatus).includes(status)) {
            throw new Error("Invalid writing task status");
        }
    }

    _validateTaskType(taskType) {
        if (!Object.values(TaskType).includes(taskType)) {
            throw new Error("Invalid task type — must be TASK_1 or TASK_2");
        }
    }

    _validateExamType(examType) {
        if (!Object.values(ExamType).includes(examType)) {
            throw new Error("Invalid exam type — must be ACADEMIC or GENERAL");
        }
    }

    _validateBandScore(score) {
        const n = Number(score);
        if (isNaN(n) || n < 0 || n > 9) {
            throw new Error("Band score must be between 0 and 9");
        }
    }

    _getMinWordCount() {
        return this._taskType === TaskType.TASK_1 ? 150 : 250;
    }

    _countWords(text) {
        if (!text || typeof text !== 'string') return 0;
        return text.trim().split(/\s+/).filter(Boolean).length;
    }

    // -------------------------------------------------------------------------
    // State-transition methods
    // -------------------------------------------------------------------------

    startWriting() {
        if (this._status !== WritingStatus.ASSIGNED) {
            throw new Error("Only assigned tasks can be started");
        }
        this._status    = WritingStatus.WRITING;
        this._updatedAt = new Date();
    }

    submit(text) {
        if (this._status !== WritingStatus.WRITING) {
            throw new Error("Only tasks in WRITING status can be submitted");
        }
        if (!text || typeof text !== 'string' || !text.trim()) {
            throw new Error("Submission text is required");
        }
        const wc  = this._countWords(text);
        const min = this._getMinWordCount();
        if (wc < min) {
            throw new Error(
                `Submission too short. ${this._taskType} requires at least ${min} words (got ${wc})`
            );
        }
        this._submissionText = text;
        this._wordCount      = wc;
        this._status         = WritingStatus.SUBMITTED;
        this._submittedAt    = new Date();
        this._updatedAt      = new Date();
    }

    review(feedback) {
        if (this._status !== WritingStatus.SUBMITTED) {
            throw new Error("Only submitted tasks can be reviewed");
        }
        if (!feedback || typeof feedback !== 'string' || !feedback.trim()) {
            throw new Error("Feedback is required for review");
        }
        this._feedback   = feedback;
        this._status     = WritingStatus.REVIEWED;
        this._reviewedAt = new Date();
        this._updatedAt  = new Date();
    }

    score(bandScore) {
        if (this._status !== WritingStatus.REVIEWED) {
            throw new Error("Only reviewed tasks can be scored");
        }
        this._validateBandScore(bandScore);
        this._bandScore = Number(bandScore);
        this._status    = WritingStatus.SCORED;
        this._updatedAt = new Date();
    }

    // -------------------------------------------------------------------------
    // Getters
    // -------------------------------------------------------------------------

    get id()             { return this._id; }
    get status()         { return this._status; }
    get taskType()       { return this._taskType; }
    get examType()       { return this._examType; }
    get wordCount()      { return this._wordCount; }
    get bandScore()      { return this._bandScore; }
}