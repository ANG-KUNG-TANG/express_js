import { teacherListTasksUC } from '../../app/teacher_uc/teacher_list_tasks.uc.js';
import { teacherSearchTasksUC } from '../../app/teacher_uc/teacher_search_tasks.uc.js';
import { teacherReviewTaskUC }  from '../../app/teacher_uc/teacher_review_task.uc.js';
import { teacherGetTaskUC }     from '../../app/teacher_uc/teacher_get_task.uc.js';
import { sendSuccess }          from '../response_formatter.js';
import { HTTP_STATUS }          from '../http_status.js';
import auditLogger              from '../../core/logger/audit.logger.js';

export const listTasks = async (req, res) => {
    const { status } = req.query;
    const tasks = await teacherListTasksUC({ status });
    return sendSuccess(res, tasks, HTTP_STATUS.OK);
};

export const searchTasks = async (req, res) => {
    const { q } = req.query;
    const tasks = await teacherSearchTasksUC({ q });
    return sendSuccess(res, tasks, HTTP_STATUS.OK);
};

export const getTask = async (req, res) => {
    const { id } = req.params;
    const task = await teacherGetTaskUC(id);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

export const reviewTask = async (req, res) => {
    const { id }       = req.params;
    const { feedback } = req.body;
    const task = await teacherReviewTaskUC(id, { feedback, teacherId: req.user.id });
    auditLogger.log('teacher.task.reviewed', { taskId: id, teacherId: req.user?.id }, req);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};