// src/app/teacher_uc/teacher_assign_task.uc.js

import * as taskRepo  from '../../infrastructure/repositories/task_repo.js';
import * as userRepo  from '../../infrastructure/repositories/user_repo.js';
import { createTaskAssignedNotificationUC } from '../notification/create_noti.uc.js';
import { TaskSource, AssignmentStatus }     from '../../domain/base/task_enums.js';
import { HTTP_STATUS }                      from '../../interfaces/http_status.js';

const fail = (msg, status) => {
    const err = new Error(msg);
    err.statusCode = status;
    err.status     = status;
    throw err;
};

export const teacherAssignTaskUC = async (teacher, body) => {
    const {
        studentId,
        title,
        questionPrompt,
        // FIX: use correct enum values — entity validates TaskType.TASK_1 / TASK_2
        taskType     = 'TASK_2',
        examType     = 'ACADEMIC',
        // FIX: use correct TaskSource enum value
        source       = TaskSource.TEACHER_NEW ?? 'teacher_new',
        dueDate,
        description,
    } = body;

    // ── Validate inputs ───────────────────────────────────────────────────────
    if (!studentId)              fail('studentId is required.',      HTTP_STATUS.BAD_REQUEST);
    if (!title?.trim())          fail('title is required.',          HTTP_STATUS.BAD_REQUEST);
    if (!questionPrompt?.trim()) fail('questionPrompt is required.', HTTP_STATUS.BAD_REQUEST);

    // ── Verify student exists ─────────────────────────────────────────────────
    const student = await userRepo.findById(studentId);
    if (!student) fail('Student not found.', HTTP_STATUS.NOT_FOUND);

    // ── FIX: Ownership check — teacher can only assign to their own students ──
    const teacherId      = String(teacher._id ?? teacher.id);
    const studentTeacher = String(student._assignedTeacher ?? student.assignedTeacher ?? '');
    if (studentTeacher !== teacherId) {
        fail('This student is not assigned to you.', HTTP_STATUS.FORBIDDEN);
    }

    // ── Create the task ───────────────────────────────────────────────────────
    // FIX: use taskRepo.createTask() — taskRepo.create() does not exist
    // FIX: field is 'source' not 'taskSource' (entity constructor param name)
    // FIX: add assignedTo + assignmentStatus so the entity is fully populated
    const task = await taskRepo.createTask({
        userId:           studentId,           // owner (student)
        assignedBy:       teacherId,           // assigning teacher
        assignedTo:       studentId,           // mirrors userId for assigned tasks
        source:           source,              // TaskSource enum value
        assignmentStatus: AssignmentStatus.PENDING_ACCEPTANCE,
        title:            title.trim(),
        description:      description?.trim() ?? '',
        questionPrompt:   questionPrompt.trim(),
        taskType,
        examType,
        status:           'ASSIGNED',
        ...(dueDate && { dueDate: new Date(dueDate) }),
    });

    // ── Notify student (fire-and-forget) ──────────────────────────────────────
    const teacherName = teacher.name ?? teacher._name ?? teacher.email ?? 'Your teacher';
    const taskId      = String(task._id ?? task.id);

    createTaskAssignedNotificationUC({
        studentId,
        teacherName,
        taskId,
        taskTitle: title.trim(),
        dueDate,
    }).catch(err =>
        console.error('[teacherAssignTaskUC] notification failed:', err.message)
    );

    return task;
};