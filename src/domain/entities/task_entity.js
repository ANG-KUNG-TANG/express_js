import { UniqueId } from "../base/id_generator.js";
import { WritingStatus, TaskType, ExamType, TaskSource, AssignmentStatus } from "../base/task_enums.js";
import { AiEvaluation } from "./ai_evaluate_entity.js";
import {
    validateRequired,
    validateStringLength,
    validateEnum,
    validateDate
} from "../validators/task_validator.js";

export class WritingTask {
    // ── Hard Private State Enclosure ──────────────────────────────────────────
    #id;
    #title;
    #description;
    #status;
    #taskType;
    #examType;
    #questionPrompt;
    #submissionText;
    #wordCount;
    #bandScore;
    #feedback;
    #userId;
    #submittedAt;
    #reviewedAt;
    #createdAt;
    #updatedAt;

    // Assignment fields
    #source;
    #assignedBy;
    #assignedTo;
    #assignmentStatus;
    #declineReason;
    #dueDate;
    #reminderSentAt;
    #unstartedNotiSentAt;

    // Complex Objects
    #aiEvaluation;

    constructor(props) {
        // 1. Run validation step prior to state capture
        validateRequired(props.userId, 'userId');
        validateRequired(props.title, 'title');
        validateStringLength(props.title, 'title', 3, 100);
        validateEnum(props.status ?? WritingStatus.ASSIGNED, WritingStatus, 'status');
        validateEnum(props.taskType, TaskType, 'taskType');
        validateEnum(props.examType, ExamType, 'examType');
        
        if (props.bandScore !== null && props.bandScore !== undefined) {
            this.#validateBandScore(props.bandScore);
        }

        // 2. Safely capture state into private fields
        this.#id             = props.id || new UniqueId().generator();
        this.#title          = props.title;
        this.#description    = props.description ?? "";
        this.#status         = props.status ?? WritingStatus.ASSIGNED;
        this.#taskType       = props.taskType;
        this.#examType       = props.examType;
        this.#questionPrompt = props.questionPrompt ?? "";
        this.#submissionText = props.submissionText ?? "";
        this.#wordCount      = props.wordCount ?? 0;
        this.#bandScore      = props.bandScore ?? null;
        this.#feedback       = props.feedback ?? "";
        this.#userId         = props.userId;
        this.#submittedAt    = props.submittedAt ? new Date(props.submittedAt) : null;
        this.#reviewedAt     = props.reviewedAt  ? new Date(props.reviewedAt)  : null;
        this.#createdAt      = props.createdAt   ?? new Date();
        this.#updatedAt      = props.updatedAt   ?? new Date();

        // Assignment context
        this.#source              = props.source ?? TaskSource.SELF;
        this.#assignedBy          = props.assignedBy ?? null;
        this.#assignedTo          = props.assignedTo ?? null;
        this.#assignmentStatus    = props.assignmentStatus ?? null;
        this.#declineReason       = props.declineReason ?? null;
        this.#dueDate             = validateDate(props.dueDate, 'dueDate', true, false);
        this.#reminderSentAt      = props.reminderSentAt ? new Date(props.reminderSentAt) : null;
        this.#unstartedNotiSentAt = props.unstartedNotiSentAt ? new Date(props.unstartedNotiSentAt) : null;

        // AI evaluation structural check
        if (props.aiEvaluation instanceof AiEvaluation) {
            this.#aiEvaluation = props.aiEvaluation;
        } else if (props.aiEvaluation && typeof props.aiEvaluation === 'object') {
            this.#aiEvaluation = new AiEvaluation(props.aiEvaluation);
        } else {
            this.#aiEvaluation = null;
        }
    }

    // ── Private Business Rule Helpers ─────────────────────────────────────────
    #validateBandScore(score) {
        const n = Number(score);
        if (isNaN(n) || n < 0 || n > 9) {
            throw new Error("Band score must be between 0 and 9");
        }
    }

    #getMinWordCount() {
        return this.#taskType === TaskType.TASK_1 ? 150 : 250;
    }

    #countWords(text) {
        if (!text || typeof text !== 'string') return 0;
        return text.trim().split(/\s+/).filter(Boolean).length;
    }

    // ── Encapsulated State Workflows ──────────────────────────────────────────
    startWriting() {
        if (this.#status !== WritingStatus.ASSIGNED) {
            throw new Error("Only assigned tasks can be started");
        }
        if (this.#assignedBy && this.#assignmentStatus !== AssignmentStatus.ACCEPTED) {
            throw new Error("You must accept this task before you can start writing");
        }
        this.#status    = WritingStatus.WRITING;
        this.#updatedAt = new Date();
    }

    submit(text) {
        if (this.#status !== WritingStatus.WRITING) {
            throw new Error("Only tasks in WRITING status can be submitted");
        }
        if (!text || typeof text !== 'string' || !text.trim()) {
            throw new Error("Submission text is required");
        }
        const wc  = this.#countWords(text);
        const min = this.#getMinWordCount();
        if (wc < min) {
            throw new Error(
                `Submission too short. ${this.#taskType} requires at least ${min} words (got ${wc})`
            );
        }
        this.#submissionText = text;
        this.#wordCount      = wc;
        this.#status         = WritingStatus.SUBMITTED;
        this.#submittedAt    = new Date();
        this.#updatedAt      = new Date();
    }

    review(feedback) {
        if (this.#status !== WritingStatus.SUBMITTED) {
            throw new Error("Only submitted tasks can be reviewed");
        }
        if (!feedback || typeof feedback !== 'string' || !feedback.trim()) {
            throw new Error("Feedback is required for review");
        }
        this.#feedback   = feedback;
        this.#status     = WritingStatus.REVIEWED;
        this.#reviewedAt = new Date();
        this.#updatedAt  = new Date();
    }

    score(bandScore) {
        if (this.#status !== WritingStatus.REVIEWED) {
            throw new Error("Only reviewed tasks can be scored");
        }
        this.#validateBandScore(bandScore);
        this.#bandScore = Number(bandScore);
        this.#status    = WritingStatus.SCORED;
        this.#updatedAt = new Date();
    }

    aiEvaluate(evaluation) {
        if (!this.#submissionText || !this.#submissionText.trim()) {
            throw new Error('Cannot AI-evaluate a task with no submission text.');
        }
        if (!(evaluation instanceof AiEvaluation)) {
            throw new Error('aiEvaluate() expects an AiEvaluation instance.');
        }
        this.#aiEvaluation = evaluation;
        this.#updatedAt    = new Date();
    }

    acceptAssignment() {
        if (this.#assignmentStatus !== AssignmentStatus.PENDING_ACCEPTANCE) {
            throw new Error(`Assignment is already "${this.#assignmentStatus}"`);
        }
        this.#assignmentStatus = AssignmentStatus.ACCEPTED;
        this.#updatedAt        = new Date();
    }

    declineAssignment(reason) {
        if (this.#assignmentStatus !== AssignmentStatus.PENDING_ACCEPTANCE) {
            throw new Error(`Assignment is already "${this.#assignmentStatus}"`);
        }
        if (!reason?.trim()) throw new Error("A reason is required when declining");
        this.#assignmentStatus = AssignmentStatus.DECLINED;
        this.#declineReason    = reason.trim();
        this.#updatedAt        = new Date();
    }

    updateDetails(title, description) {
        this.#title = title;
        this.#description = description;
        this.#updatedAt = new Date();
    }

    // ── Pure Read-Only Getters ────────────────────────────────────────────────
    get id()                  { return this.#id; }
    get title()               { return this.#title; }
    get description()         { return this.#description; }
    get status()              { return this.#status; }
    get taskType()            { return this.#taskType; }
    get examType()            { return this.#examType; }
    get questionPrompt()      { return this.#questionPrompt; }
    get submissionText()      { return this.#submissionText; }
    get wordCount()           { return this.#wordCount; }
    get bandScore()           { return this.#bandScore; }
    get feedback()            { return this.#feedback; }
    get userId()              { return this.#userId; }
    get submittedAt()         { return this.#submittedAt; }
    get reviewedAt()          { return this.#reviewedAt; }
    get createdAt()           { return this.#createdAt; }
    get updatedAt()           { return this.#updatedAt; }
    get source()              { return this.#source; }
    get assignedBy()          { return this.#assignedBy; }
    get assignedTo()          { return this.#assignedTo; }
    get assignmentStatus()    { return this.#assignmentStatus; }
    get declineReason()       { return this.#declineReason; }
    get dueDate()             { return this.#dueDate; }
    get reminderSentAt()      { return this.#reminderSentAt; }
    get unstartedNotiSentAt() { return this.#unstartedNotiSentAt; }
    get aiEvaluation()        { return this.#aiEvaluation; }

    isAssigned()    { return this.#assignedBy !== null; }
    isSelfCreated() { return this.#source === TaskSource.SELF; }
    isAccepted()    { return this.#assignmentStatus === AssignmentStatus.ACCEPTED; }
    isDeclined()    { return this.#assignmentStatus === AssignmentStatus.DECLINED; }

    // ── Clean Serialization Matrix ────────────────────────────────────────────
    toJSON() {
        return {
            id:                  this.#id,
            title:               this.#title,
            description:         this.#description,
            status:              this.#status,
            taskType:            this.#taskType,
            examType:            this.#examType,
            questionPrompt:      this.#questionPrompt,
            submissionText:      this.#submissionText,
            wordCount:           this.#wordCount,
            bandScore:           this.#bandScore,
            feedback:            this.#feedback,
            userId:              this.#userId,
            submittedAt:         this.#submittedAt,
            reviewedAt:          this.#reviewedAt,
            createdAt:           this.#createdAt,
            updatedAt:           this.#updatedAt,
            source:              this.#source,
            assignedBy:          this.#assignedBy,
            assignedTo:          this.#assignedTo,
            assignmentStatus:    this.#assignmentStatus,
            declineReason:       this.#declineReason,
            dueDate:             this.#dueDate,
            reminderSentAt:      this.#reminderSentAt,
            unstartedNotiSentAt: this.#unstartedNotiSentAt,
            aiEvaluation:        this.#aiEvaluation ? this.#aiEvaluation.toJSON() : null,
        };
    }
}