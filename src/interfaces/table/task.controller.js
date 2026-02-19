import { createTask } from '../../app/task_uc/create_task.uc.js';
import { getTaskById } from '../../app/task_uc/get_task.uc.js';
import { listTasks } from '../../app/task_uc/list_task.uc.js';
import { searchTasks } from '../../app/task_uc/search_task.uc.js';
import { updateTask } from '../../app/task_uc/update_task.uc.js';
import { deleteTask } from '../../app/task_uc/delete_task.uc.js';
import { startTask } from '../../app/task_uc/start_task.uc.js';
import { completeTask } from '../../app/task_uc/complete_task.uc.js';
import { transferTasks } from '../../app/task_uc/transfer_task.uc.js';
import { sendSuccess } from '../response_formatter.js';
import { HTTP_STATUS } from '../http_status.js';
import { sanitizeCreateInput, sanitizeUpdateInput } from './task.input_sanitizer.js'; 


export const createTaskController = async (req, res) => {
    const input = sanitizeCreateInput(req.body);
    const task = await createTask(req.user.id, input);
    return sendSuccess(res, task, HTTP_STATUS.CREATED);
};

export const getTaskByIdController = async (req, res) => {
    const { id } = req.params;
    const task = await getTaskById(id, req.user.id);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

export const listTaskController = async (req, res) => {
    const { status, priority, page, limit, sortBy, sortOrder } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;

    const options = { page, limit, sortBy, sortOrder };
    const tasks = await listTasks(filters, options, req.user.id);
    return sendSuccess(res, tasks, HTTP_STATUS.OK);
};

export const searchTaskController = async (req, res) => {
    const { q, page, limit, sortBy, sortOrder } = req.query;
    const options = { page, limit, sortBy, sortOrder };
    const tasks = await searchTasks(q, options, req.user.id);
    return sendSuccess(res, tasks, HTTP_STATUS.OK);
};

export const updateTaskController = async (req, res) => {
    const { id } = req.params;
    const updates = sanitizeUpdateInput(req.body);
    const task = await updateTask(id, updates, req.user.id);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

export const deleteTaskController = async (req, res) => {
    const { id } = req.params;
    const result = await deleteTask(id, req.user.id);
    return sendSuccess(res, result, HTTP_STATUS.OK);
};

export const startTaskController = async (req, res) => {
    const { id } = req.params;
    const task = await startTask(id, req.user.id);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

export const completeTaskController = async (req, res) => {
    const { id } = req.params;
    const task = await completeTask(id, req.user.id);
    return sendSuccess(res, task, HTTP_STATUS.OK);
};

export const transferTaskController = async (req, res) => {
    const { fromUserId, toUserId } = req.body;
    const result = await transferTasks(fromUserId, toUserId);
    return sendSuccess(res, result, HTTP_STATUS.OK);
};