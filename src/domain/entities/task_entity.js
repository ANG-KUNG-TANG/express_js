import { UniqueId } from "../base/id_generator.js";
import { WritingStatus, TaskType, ExamType, TaskSource, AssignmentStatus } from "../base/task_enums.js";


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
        reviewedAt  = null,
        createdAt   = new Date(),
        updatedAt   = new Date(),

        // ── Assignment fields (new) ─────────────────────────────────────────
        source             = TaskSource.SELF,
        assignedBy         = null,   // teacher's userId (ObjectId string)
        assignedTo         = null,   // student's userId (mirrors userId for assigned tasks)
        assignmentStatus   = null,   // AssignmentStatus | null for self-created
        declineReason      = null,   // student's reason when declining
        dueDate            = null,   // ISO date string set by teacher
        reminderSentAt     = null,   // last TASK_REMINDER noti timestamp
        unstartedNotiSentAt = null,  // last TASK_UNSTARTED noti timestamp
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

        // assignment
        this._source              = source;
        this._assignedBy          = assignedBy;
        this._assignedTo          = assignedTo;
        this._assignmentStatus    = assignmentStatus;
        this._declineReason       = declineReason;
        this._dueDate             = dueDate ? new Date(dueDate) : null;
        this._reminderSentAt      = reminderSentAt ? new Date(reminderSentAt) : null;
        this._unstartedNotiSentAt = unstartedNotiSentAt ? new Date(unstartedNotiSentAt) : null;
    }

    // -------------------------------------------------------------------------
    // Validators (unchanged)
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
    // State-transition methods (unchanged)
    // -------------------------------------------------------------------------

    startWriting() {
        if (this._status !== WritingStatus.ASSIGNED) {
            throw new Error("Only assigned tasks can be started");
        }
        // Guard: assigned tasks must be accepted before starting
        if (this._assignedBy && this._assignmentStatus !== AssignmentStatus.ACCEPTED) {
            throw new Error("You must accept this task before you can start writing");
        }
        this._status    = WritingStatus.WRITING;
        this._startedAt = new Date();
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
    // Assignment helpers (new)
    // -------------------------------------------------------------------------

    isAssigned()   { return this._assignedBy !== null; }
    isSelfCreated(){ return this._source === TaskSource.SELF; }
    isAccepted()   { return this._assignmentStatus === AssignmentStatus.ACCEPTED; }
    isDeclined()   { return this._assignmentStatus === AssignmentStatus.DECLINED; }

    acceptAssignment() {
        if (this._assignmentStatus !== AssignmentStatus.PENDING_ACCEPTANCE) {
            throw new Error(`Assignment is already "${this._assignmentStatus}"`);
        }
        this._assignmentStatus = AssignmentStatus.ACCEPTED;
        this._updatedAt        = new Date();
    }

    declineAssignment(reason) {
        if (this._assignmentStatus !== AssignmentStatus.PENDING_ACCEPTANCE) {
            throw new Error(`Assignment is already "${this._assignmentStatus}"`);
        }
        if (!reason?.trim()) throw new Error("A reason is required when declining");
        this._assignmentStatus = AssignmentStatus.DECLINED;
        this._declineReason    = reason.trim();
        this._updatedAt        = new Date();
    }

    // -------------------------------------------------------------------------
    // Getters — existing unchanged, new ones appended
    // -------------------------------------------------------------------------

    get id()             { return this._id; }
    get title()          { return this._title; }
    get description()    { return this._description; }
    get status()         { return this._status; }
    get taskType()       { return this._taskType; }
    get examType()       { return this._examType; }
    get questionPrompt() { return this._questionPrompt; }
    get submissionText() { return this._submissionText; }
    get wordCount()      { return this._wordCount; }
    get bandScore()      { return this._bandScore; }
    get feedback()       { return this._feedback; }
    get userId()         { return this._userId; }
    get submittedAt()    { return this._submittedAt; }
    get reviewedAt()     { return this._reviewedAt; }
    get createdAt()      { return this._createdAt; }
    get updatedAt()      { return this._updatedAt; }

    // assignment getters (new)
    get source()               { return this._source; }
    get assignedBy()           { return this._assignedBy; }
    get assignedTo()           { return this._assignedTo; }
    get assignmentStatus()     { return this._assignmentStatus; }
    get declineReason()        { return this._declineReason; }
    get dueDate()              { return this._dueDate; }
    get reminderSentAt()       { return this._reminderSentAt; }
    get unstartedNotiSentAt()  { return this._unstartedNotiSentAt; }

    // -------------------------------------------------------------------------
    // toJSON — includes new assignment fields
    // -------------------------------------------------------------------------

    toJSON() {
        return {
            _id:                 this._id,
            title:               this._title,
            description:         this._description,
            status:              this._status,
            taskType:            this._taskType,
            examType:            this._examType,
            questionPrompt:      this._questionPrompt,
            submissionText:      this._submissionText,
            wordCount:           this._wordCount,
            bandScore:           this._bandScore,
            feedback:            this._feedback,
            userId:              this._userId,
            submittedAt:         this._submittedAt,
            reviewedAt:          this._reviewedAt,
            createdAt:           this._createdAt,
            updatedAt:           this._updatedAt,
            // assignment (new)
            source:              this._source,
            assignedBy:          this._assignedBy,
            assignedTo:          this._assignedTo,
            assignmentStatus:    this._assignmentStatus,
            declineReason:       this._declineReason,
            dueDate:             this._dueDate,
            reminderSentAt:      this._reminderSentAt,
            unstartedNotiSentAt: this._unstartedNotiSentAt,
        };
    }
}