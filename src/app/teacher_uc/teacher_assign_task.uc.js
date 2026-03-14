/**
 * teacher_assign_task.uc.js
 *
 * Assigns a writing task to a student. Three modes (controlled by `source`):
 *   teacher_new      — teacher writes brand-new task
 *   teacher_existing — clones an existing task from the pool
 *   teacher_topic    — teacher sets taskType/examType, student writes
 *
 * Status flow for assigned tasks:
 *   ASSIGNED (pending_acceptance) → accepted → WRITING → SUBMITTED → REVIEWED → SCORED
 *
 * Fires TASK_ASSIGNED notification immediately after saving.
 */

import { WritingStatus, TaskType, ExamType, TaskSource, AssignmentStatus  } from '../../domain/base/task_enums.js';
import {
    createTask,
    findTaskByID,
} from '../../infrastructure/repositories/task_repo.js';
import * as userRepo  from '../../infrastructure/repositories/user_repo.js';
import { sendNotificationUseCase } from '../notification/send_noti.uc.js';
import { NotificationType } from '../../domain/entities/notificaiton_entity.js';
import {
    NotFoundError,
    ForbiddenError,
    ValidationError,
} from '../../core/errors/base.errors.js';

// ── Validation ────────────────────────────────────────────────────────────────

function validateCommonFields({ studentId, source, dueDate }) {
    if (!studentId) throw new ValidationError('studentId is required');
    if (!source || !Object.values(TaskSource).includes(source)) {
        throw new ValidationError(`source must be one of: ${Object.values(TaskSource).join(', ')}`);
    }
    if (dueDate && isNaN(new Date(dueDate).getTime())) {
        throw new ValidationError('dueDate must be a valid date string');
    }
}

function validateNewTask({ title, taskType, examType }) {
    if (!title?.trim())  throw new ValidationError('title is required for teacher_new');
    if (!Object.values(TaskType).includes(taskType)) {
        throw new ValidationError('taskType must be TASK_1 or TASK_2');
    }
    if (!Object.values(ExamType).includes(examType)) {
        throw new ValidationError('examType must be ACADEMIC or GENERAL');
    }
}

function validateTopicTask({ taskType, examType }) {
    if (!Object.values(TaskType).includes(taskType)) {
        throw new ValidationError('taskType must be TASK_1 or TASK_2');
    }
    if (!Object.values(ExamType).includes(examType)) {
        throw new ValidationError('examType must be ACADEMIC or GENERAL');
    }
}

// ── Main UC ───────────────────────────────────────────────────────────────────

export async function teacherAssignTaskUC(teacher, payload) {
    const {
        studentId,
        source,
        dueDate,
        // teacher_new / teacher_topic
        title,
        description,
        taskType,
        examType,
        questionPrompt,
        // teacher_new only
        submissionText,
        // teacher_existing only
        sourceTaskId,
    } = payload;

    // 1. Validate common fields
    validateCommonFields({ studentId, source, dueDate });

    // 2. Verify student exists and belongs to this teacher
    const student = await userRepo.findById(studentId);
    if (!student) throw new NotFoundError('Student not found');
    if (String(student.assignedTeacher) !== String(teacher.id)) {
        throw new ForbiddenError('You can only assign tasks to your own students');
    }

    // 3. Build props based on mode
    let taskProps;

    if (source === TaskSource.TEACHER_NEW) {
        validateNewTask({ title, taskType, examType });
        taskProps = {
            userId:         studentId,
            title:          title.trim(),
            description:    description?.trim() ?? '',
            taskType,
            examType,
            questionPrompt: questionPrompt?.trim() ?? '',
            submissionText: submissionText?.trim() ?? '',
            status:         WritingStatus.ASSIGNED,
        };
    }

    else if (source === TaskSource.TEACHER_EXISTING) {
        if (!sourceTaskId) throw new ValidationError('sourceTaskId is required for teacher_existing');

        const original = await findTaskByID(sourceTaskId);
        // Clone: same content, new owner, reset progress fields
        taskProps = {
            userId:         studentId,
            title:          original._title,
            description:    original._description,
            taskType:       original._taskType,
            examType:       original._examType,
            questionPrompt: original._questionPrompt,
            submissionText: '',
            wordCount:      0,
            bandScore:      null,
            feedback:       '',
            status:         WritingStatus.ASSIGNED,
        };
    }

    else if (source === TaskSource.TEACHER_TOPIC) {
        validateTopicTask({ taskType, examType });
        // Teacher only sets type + exam; student writes from scratch
        taskProps = {
            userId:         studentId,
            title:          title?.trim() ?? `${examType} ${taskType} task`,
            description:    description?.trim() ?? '',
            taskType,
            examType,
            questionPrompt: questionPrompt?.trim() ?? '',
            submissionText: '',
            status:         WritingStatus.ASSIGNED,
        };
    }

    // 4. Attach assignment metadata
    const fullProps = {
        ...taskProps,
        source,
        assignedBy:       teacher.id,
        assignedTo:       studentId,
        assignmentStatus: AssignmentStatus.PENDING_ACCEPTANCE,
        dueDate:          dueDate ?? null,
    };

    // 5. Persist via existing createTask (builds WritingTask internally)
    const saved = await createTask(fullProps);

    // 6. Fire immediate notification to student
    await sendNotificationUseCase({
        userId:  studentId,
        type:    NotificationType.TASK_ASSIGNED,
        title:   'New task assigned',
        message: `Your teacher assigned you a new task: "${saved._title}"`,
        metadata: {
            taskId:      saved._id,
            teacherId:   teacher.id,
            teacherName: `${teacher.firstName} ${teacher.lastName}`,
            dueDate:     dueDate ?? null,
            source,
        },
    });

    return saved;
}