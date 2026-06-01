// src/app/teacher_uc/teacher_assign_task.uc.js
import * as teacherService              from '../../core/services/teacher_service.js';
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
    throw err;
};

const buildPayload = ({ studentId, teacherId, title, questionPrompt, taskType, examType, source, description, dueDate }) => ({
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
    const mode = body.taskSource ?? 'teacher_new';

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
        // fix: was taskRepo.findById — now goes through service
        const existing = await teacherService.findTaskById(body.taskId.trim());
        if (!existing) fail('Task not found.', HTTP_STATUS.NOT_FOUND);
        return {
            title:          existing.title,
            questionPrompt: existing.questionPrompt,
            taskType:       existing.taskType ?? 'TASK_2',
            examType:       existing.examType ?? 'ACADEMIC',
            source:         mode,
        };
    }

    if (mode === 'teacher_topic') {
        if (!body.topic?.trim()) fail('topic is required for teacher_topic mode.');
        const keyword = body.topic.trim().toLowerCase();
        // fix: was taskRepo.findOneByTopic which doesn't exist — use service.findTaskByTitle
        const match = await teacherService.findTaskByTitle(keyword);
        if (match) {
            logger.debug('teacherAssignTaskUC: topic match found', { keyword, taskId: match.id });
            return {
                title:          match.title,
                questionPrompt: match.questionPrompt,
                taskType:       match.taskType ?? 'TASK_2',
                examType:       match.examType ?? 'ACADEMIC',
                source:         mode,
            };
        }
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

export const teacherAssignTaskUC = async (teacher, body, req = null) => {
    const { studentId, dueDate, description } = body;
    const teacherId   = String(teacher.id ?? teacher._id);
    const teacherName = teacher.name ?? teacher.email ?? 'Your teacher';
    const taskData    = await resolveTaskData(body);
    const shared      = { teacherId, ...taskData, description, dueDate };

    logger.debug('teacherAssignTaskUC', { mode: body.taskSource, teacherId, studentId: studentId ?? '(bulk)' });

    // ── Single student ────────────────────────────────────────────────────────
    if (studentId) {
        const student = await userRepo.findUserById(studentId);
        if (!student) fail('Student not found.', HTTP_STATUS.NOT_FOUND);

        if (String(student.assignedTeacher) !== teacherId) {
            recordFailure(AuditAction.TEACHER_TASK_ASSIGNED, teacherId,
                { reason: 'student not linked to this teacher', studentId }, req);
            fail('This student is not assigned to you.', HTTP_STATUS.FORBIDDEN);
        }

        const task   = await teacherService.createTask(buildPayload({ studentId, ...shared }));
        const taskId = String(task.id);

        recordAudit(AuditAction.TEACHER_TASK_ASSIGNED, teacherId,
            { taskId, studentId, title: taskData.title, taskSource: body.taskSource ?? 'teacher_new', bulk: false }, req);

        NotificationService.send({
            recipientId: studentId, actorId: teacherId,
            type: NotificationService.TYPES.TASK_ASSIGNED,
            title: 'New task assigned',
            message: `${teacherName} assigned "${taskData.title}" to you`,
            refId: taskId, refModel: 'Task',
        });

        return task;
    }

    // ── Bulk ──────────────────────────────────────────────────────────────────
    const students = await userRepo.findStudentsByTeacher(teacherId);
    if (!students.length) fail('You have no students assigned to you.');

    const tasks = await teacherService.createManyTasks(
        students.map((s) => buildPayload({ studentId: String(s.id), ...shared }))
    );

    recordAudit(AuditAction.TEACHER_TASK_ASSIGNED, teacherId,
        { title: taskData.title, taskSource: body.taskSource ?? 'teacher_new', bulk: true, count: tasks.length }, req);

    NotificationService.sendToMany(
        students.map((s) => String(s.id)),
        { actorId: teacherId, type: NotificationService.TYPES.TASK_ASSIGNED,
          title: 'New task assigned', message: `${teacherName} assigned "${taskData.title}" to you`, refModel: 'Task' }
    );

    return { assigned: tasks.length, tasks };
};