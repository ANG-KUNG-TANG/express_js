// src/app/teacher_uc/teacher_assign_task.uc.js
//
// Three modes — decided by body.taskSource:
//   teacher_new      → create a brand-new task and assign it
//   teacher_existing → assign an already-existing task by taskId
//   teacher_topic    → find/create a task by topic keyword and assign it
//
// Scope — decided by whether body.studentId is present:
//   Single: body includes studentId → assign to one student
//   Bulk:   body omits  studentId   → assign to ALL linked students

import * as taskRepo                    from '../../infrastructure/repositories/task_repo.js';
import * as userRepo                    from '../../infrastructure/repositories/user_repo.js';
import { TaskSource, AssignmentStatus } from '../../domain/base/task_enums.js';
import { HTTP_STATUS }                  from '../../interfaces/http_status.js';
import { NotificationService }          from '../../core/services/notification.service.js';
import { recordAudit, recordFailure }   from '../../core/services/audit.service.js';
import { AuditAction }                  from '../../domain/base/audit_enums.js';
import logger                           from '../../core/logger/logger.js';

const fail = (msg, status = HTTP_STATUS.BAD_REQUEST) => {
    const err = new Error(msg);
    err.statusCode = status;
    err.status     = status;
    throw err;
};

const buildPayload = ({
    studentId, teacherId,
    title, questionPrompt, taskType, examType,
    source, description, dueDate,
}) => ({
    userId:           studentId,
    assignedBy:       teacherId,
    assignedTo:       studentId,
    source,
    assignmentStatus: AssignmentStatus.PENDING_ACCEPTANCE,
    title:            title?.trim() ?? '',
    description:      description?.trim() ?? '',
    questionPrompt:   questionPrompt?.trim() ?? '',
    taskType,
    examType,
    status:           'ASSIGNED',
    ...(dueDate && { dueDate: new Date(dueDate) }),
});

const resolveTaskData = async (body) => {
    const mode = body.taskSource ?? TaskSource.TEACHER_NEW ?? 'teacher_new';

    if (mode === 'teacher_new') {
        if (!body.title?.trim())          fail('title is required.');
        if (!body.questionPrompt?.trim()) fail('questionPrompt is required.');
        return {
            title:          body.title.trim(),
            questionPrompt: body.questionPrompt.trim(),
            taskType:       body.taskType ?? 'TASK_2',
            examType:       body.examType ?? 'ACADEMIC',
            source:         mode,
        };
    }

    if (mode === 'teacher_existing') {
        if (!body.taskId?.trim()) fail('taskId is required for teacher_existing mode.');
        const existing = await taskRepo.findById(body.taskId.trim());
        if (!existing) fail('Task not found.', HTTP_STATUS.NOT_FOUND);
        return {
            title:          existing.title          ?? existing._title          ?? '',
            questionPrompt: existing.questionPrompt ?? existing._questionPrompt ?? '',
            taskType:       existing.taskType       ?? existing._taskType       ?? 'TASK_2',
            examType:       existing.examType       ?? existing._examType       ?? 'ACADEMIC',
            source:         mode,
        };
    }

    if (mode === 'teacher_topic') {
        if (!body.topic?.trim()) fail('topic is required for teacher_topic mode.');
        const keyword = body.topic.trim().toLowerCase();
        const match   = await taskRepo.findOneByTopic(keyword);
        if (match) {
            logger.debug('teacherAssignTaskUC: topic match found', { keyword, taskId: match._id ?? match.id });
            return {
                title:          match.title          ?? match._title          ?? keyword,
                questionPrompt: match.questionPrompt ?? match._questionPrompt ?? keyword,
                taskType:       match.taskType       ?? match._taskType       ?? 'TASK_2',
                examType:       match.examType       ?? match._examType       ?? 'ACADEMIC',
                source:         mode,
            };
        }
        logger.debug('teacherAssignTaskUC: no topic match, using keyword as title', { keyword });
        return {
            title:          keyword,
            questionPrompt: `Write about the topic: ${keyword}`,
            taskType:       body.taskType ?? 'TASK_2',
            examType:       body.examType ?? 'ACADEMIC',
            source:         mode,
        };
    }

    fail(`Unknown taskSource: "${mode}"`);
};

// ─────────────────────────────────────────────────────────────────────────────
// Main UC
// ─────────────────────────────────────────────────────────────────────────────
export const teacherAssignTaskUC = async (teacher, body, req = null) => {
    const { studentId, dueDate, description } = body;

    const teacherId   = String(teacher._id ?? teacher.id);
    const teacherName = teacher._name ?? teacher.name ?? teacher.email ?? 'Your teacher';

    const taskData = await resolveTaskData(body);
    const shared   = { teacherId, ...taskData, description, dueDate };

    logger.debug('teacherAssignTaskUC', {
        mode: body.taskSource,
        teacherId,
        studentId: studentId ?? '(bulk)',
    });

    // =========================================================================
    // MODE A — SINGLE STUDENT
    // =========================================================================
    if (studentId) {
        const student = await userRepo.findById(studentId);
        if (!student) fail('Student not found.', HTTP_STATUS.NOT_FOUND);

        const linkedTeacher = String(student._assignedTeacher ?? student.assignedTeacher ?? '');
        if (linkedTeacher !== teacherId) {
            recordFailure(AuditAction.TEACHER_TASK_ASSIGNED, teacherId,
                { reason: 'student not linked to this teacher', studentId },
                req
            );
            fail('This student is not assigned to you.', HTTP_STATUS.FORBIDDEN);
        }

        const task   = await taskRepo.createTask(buildPayload({ studentId, ...shared }));
        const taskId = String(task._id ?? task.id);

        logger.info('teacherAssignTaskUC: task assigned (single)', { taskId, studentId, teacherId });

        recordAudit(AuditAction.TEACHER_TASK_ASSIGNED, teacherId, {
            taskId,
            studentId,
            title:      taskData.title,
            taskSource: body.taskSource ?? 'teacher_new',
            bulk:       false,
        }, req);

        NotificationService.send({
            recipientId: studentId,
            actorId:     teacherId,
            type:        NotificationService.TYPES.TASK_ASSIGNED,
            title:       'New task assigned',
            message:     `${teacherName} assigned "${taskData.title}" to you`,
            refId:       taskId,
            refModel:    'Task',
        });

        NotificationService.send({
            recipientId: teacherId,
            actorId:     teacherId,
            type:        NotificationService.TYPES.TASK_ASSIGNED,
            title:       'Task assigned',
            message:     `You assigned "${taskData.title}" to a student`,
            refId:       taskId,
            refModel:    'Task',
        });

        return task;
    }

    // =========================================================================
    // MODE B — BULK
    // =========================================================================
    const students = await userRepo.findStudentsByTeacher(teacherId);

    if (students.length === 0) {
        fail('You have no students assigned to you. Cannot perform bulk assignment.');
    }

    const tasks = await taskRepo.createManyTasks(
        students.map((s) => buildPayload({ studentId: String(s._id ?? s.id), ...shared }))
    );

    logger.info('teacherAssignTaskUC: tasks assigned (bulk)', { count: tasks.length, teacherId });

    recordAudit(AuditAction.TEACHER_TASK_ASSIGNED, teacherId, {
        title:      taskData.title,
        taskSource: body.taskSource ?? 'teacher_new',
        bulk:       true,
        count:      tasks.length,
        studentIds: students.map((s) => String(s._id ?? s.id)),
    }, req);

    NotificationService.sendToMany(
        students.map((s) => String(s._id ?? s.id)),
        {
            actorId:  teacherId,
            type:     NotificationService.TYPES.TASK_ASSIGNED,
            title:    'New task assigned',
            message:  `${teacherName} assigned "${taskData.title}" to you`,
            refModel: 'Task',
        }
    );

    return { assigned: tasks.length, tasks };
};