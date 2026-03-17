import { teacherListTasksUC }          from '../../app/teacher_uc/teacher_list_tasks.uc.js';
import { teacherSearchTasksUC }         from '../../app/teacher_uc/teacher_search_tasks.uc.js';
import { teacherReviewTaskUC }          from '../../app/teacher_uc/teacher_review_task.uc.js';
import { teacherGetTaskUC }             from '../../app/teacher_uc/teacher_get_task.uc.js';
import { teacherAssignTaskUC }          from '../../app/teacher_uc/teacher_assign_task.uc.js';
import { teacherListStudentsUC }        from '../../app/teacher_uc/teacher_list_students.uc.js';
import { teacherListAssignedTasksUC }   from '../../app/teacher_uc/teacher_list_assign_tasks.uc.js';
import { sendSuccess }                  from '../response_formatter.js';
import { HTTP_STATUS }                  from '../http_status.js';
import auditLogger                      from '../../core/logger/audit.logger.js';

// ── Existing handlers — untouched ─────────────────────────────────────────────

export const listTasks = async (req, res) => {
    const { status } = req.query;
    const teacherId = req.user?.id ?? req.user?._id;
    const tasks = await teacherListTasksUC({ teacherId, status });
    return sendSuccess(res, tasks, HTTP_STATUS.OK);
};

export const searchTasks = async (req, res) => {
    const { q } = req.query;
    const teacherId = req.user?.id ?? req.user?._id;
    const tasks = await teacherSearchTasksUC({ teacherId, q });
    return sendSuccess(res, tasks, HTTP_STATUS.OK);
};

export const getTask = async (req, res) => {
    const { id } = req.params;
    const task = await teacherGetTaskUC(id);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

// ── reviewTask — signature updated to match new UC ────────────────────────────
// OLD call: teacherReviewTaskUC(id, { feedback, teacherId })
// NEW call: teacherReviewTaskUC(teacher, { taskId, bandScore, feedback })
//
// Change: pass full req.user as teacher, add bandScore from body, taskId from params.
// The new UC handles the assignedBy ownership guard + TASK_SCORED notification.
export const reviewTask = async (req, res) => {
    const teacher             = req.user;
    const { id }              = req.params;
    const { feedback, bandScore } = req.body;

    const task = await teacherReviewTaskUC(teacher, {
        taskId: id,
        bandScore,
        feedback,
    });

    auditLogger.log('teacher.task.reviewed', { taskId: id, teacherId: req.user?.id }, req);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

// ── New handlers — assignment system ─────────────────────────────────────────

// POST /api/teacher/assign
// Body: { studentId, source, taskType, examType, title?, description?,
//         questionPrompt?, sourceTaskId?, dueDate? }
export const assignTask = async (req, res) => {
    const teacher = req.user;
    const task = await teacherAssignTaskUC(teacher, req.body);
    return sendSuccess(res, task, HTTP_STATUS.CREATED);
};

// GET /api/teacher/students?stats=true
export const listStudents = async (req, res) => {
    const teacher          = req.user;
    const includeTaskStats = req.query.stats === 'true';
    const students = await teacherListStudentsUC(teacher, { includeTaskStats });
    return sendSuccess(res, students, HTTP_STATUS.OK);
};

// GET /api/teacher/students/:studentId/tasks
// Query: ?status=SUBMITTED&assignmentStatus=accepted&page=1&limit=20
export const getStudentTasks = async (req, res) => {
    const teacher       = req.user;
    const { studentId } = req.params;
    const result = await teacherListAssignedTasksUC(teacher, {
        studentId,
        status:           req.query.status,
        assignmentStatus: req.query.assignmentStatus,
        page:             req.query.page,
        limit:            req.query.limit,
    });
    return sendSuccess(res, result, HTTP_STATUS.OK);
};

// GET /api/teacher/assigned-tasks
// Query: ?status=SUBMITTED&assignmentStatus=accepted&page=1&limit=20
export const listAssignedTasks = async (req, res) => {
    const teacher = req.user;
    const result = await teacherListAssignedTasksUC(teacher, {
        status:           req.query.status,
        assignmentStatus: req.query.assignmentStatus,
        page:             req.query.page,
        limit:            req.query.limit,
    });
    return sendSuccess(res, result, HTTP_STATUS.OK);
};