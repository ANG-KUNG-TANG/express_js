// interfaces/table/teacher.controller.js

import { teacherListTasksUC }          from '../../app/teacher_uc/teacher_list_tasks.uc.js';
import { teacherSearchTasksUC }         from '../../app/teacher_uc/teacher_search_tasks.uc.js';
import { teacherReviewTaskUC }          from '../../app/teacher_uc/teacher_review_task.uc.js';
import { teacherGetTaskUC }             from '../../app/teacher_uc/teacher_get_task.uc.js';
import { teacherAssignTaskUC }          from '../../app/teacher_uc/teacher_assign_task.uc.js';
import { teacherListStudentsUC }        from '../../app/teacher_uc/teacher_list_students.uc.js';
import { teacherListAssignedTasksUC }   from '../../app/teacher_uc/teacher_list_assign_tasks.uc.js';
import { sendSuccess }                  from '../response_formatter.js';
import { HTTP_STATUS }                  from '../http_status.js';
import { recordAudit }                  from '../../core/services/audit.service.js';
import { AuditAction }                  from '../../domain/base/audit_enums.js';

// ── Helper ────────────────────────────────────────────────────────────────────
// Normalises req.user into a teacher object that always has both .id and ._id
// set to the same value. teacherReviewTaskUC does teacher.id.toString(), so
// whichever field the JWT middleware populates, the UC will find a defined value.
const asTeacher = (user) => ({
    ...user,
    id:  String(user?.id  ?? user?._id ?? ''),
    _id: String(user?._id ?? user?.id  ?? ''),
});

// ── Existing handlers ─────────────────────────────────────────────────────────

export const listTasks = async (req, res) => {
    const { status } = req.query;
    const teacherId  = req.user?.id ?? req.user?._id;
    const tasks      = await teacherListTasksUC({ teacherId, status });
    return sendSuccess(res, tasks, HTTP_STATUS.OK);
};

export const searchTasks = async (req, res) => {
    const { q }     = req.query;
    const teacherId = req.user?.id ?? req.user?._id;
    const tasks     = await teacherSearchTasksUC({ teacherId, q });
    return sendSuccess(res, tasks, HTTP_STATUS.OK);
};

export const getTask = async (req, res) => {
    const { id } = req.params;
    const task   = await teacherGetTaskUC(id);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

// PATCH /api/teacher/writing-tasks/:id/review
// Passes a normalised teacher object so teacherReviewTaskUC's ownership check
// (teacher.id.toString() === task._assignedBy.toString()) never fails silently
// due to a missing .id field on req.user.
export const reviewTask = async (req, res) => {
    const teacher             = asTeacher(req.user);
    const { id }              = req.params;
    const { feedback, bandScore } = req.body;

    const task = await teacherReviewTaskUC(teacher, {
        taskId:    id,
        bandScore,
        feedback,
    });

    recordAudit(AuditAction.TEACHER_TASK_REVIEWED, teacher.id, { taskId: id, bandScore }, req);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

// ── New handlers — assignment system ──────────────────────────────────────────

// POST /api/teacher/assign
export const assignTask = async (req, res) => {
    const teacher = asTeacher(req.user);
    const task    = await teacherAssignTaskUC(teacher, req.body);
    recordAudit(AuditAction.TEACHER_TASK_ASSIGNED, teacher.id, {
        taskId:    task.id ?? task._id,
        studentId: req.body.studentId,
    }, req);
    return sendSuccess(res, task, HTTP_STATUS.CREATED);
};

// GET /api/teacher/students?stats=true
export const listStudents = async (req, res) => {
    const teacher          = asTeacher(req.user);
    const includeTaskStats = req.query.stats === 'true';
    const students         = await teacherListStudentsUC(teacher, { includeTaskStats });
    return sendSuccess(res, students, HTTP_STATUS.OK);
};

// GET /api/teacher/students/:studentId/tasks
export const getStudentTasks = async (req, res) => {
    const teacher       = asTeacher(req.user);
    const { studentId } = req.params;
    const result        = await teacherListAssignedTasksUC(teacher, {
        studentId,
        status:           req.query.status,
        assignmentStatus: req.query.assignmentStatus,
        page:             req.query.page,
        limit:            req.query.limit,
    });
    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// GET /api/teacher/assigned-tasks
export const listAssignedTasks = async (req, res) => {
    const teacher = asTeacher(req.user);
    const result  = await teacherListAssignedTasksUC(teacher, {
        status:           req.query.status,
        assignmentStatus: req.query.assignmentStatus,
        page:             req.query.page,
        limit:            req.query.limit,
    });
    return sendSuccess(res, result, HTTP_STATUS.OK);
};