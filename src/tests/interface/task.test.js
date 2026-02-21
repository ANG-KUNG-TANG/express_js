import { jest, beforeEach, describe, it, expect } from "@jest/globals";
jest.unstable_mockModule('../../app/task_uc/create_task.uc.js',   () => ({ createTask:    jest.fn() }));
jest.unstable_mockModule('../../app/task_uc/get_task.uc.js',      () => ({ getTaskById:   jest.fn() }));
jest.unstable_mockModule('../../app/task_uc/list_task.uc.js',     () => ({ listTasks:     jest.fn() }));
jest.unstable_mockModule('../../app/task_uc/search_task.uc.js',   () => ({ searchTasks:   jest.fn() }));
jest.unstable_mockModule('../../app/task_uc/update_task.uc.js',   () => ({ updateTask:    jest.fn() }));
jest.unstable_mockModule('../../app/task_uc/delete_task.uc.js',   () => ({ deleteTask:    jest.fn() }));
jest.unstable_mockModule('../../app/task_uc/start_task.uc.js',    () => ({ startTask:     jest.fn() }));
jest.unstable_mockModule('../../app/task_uc/complete_task.uc.js', () => ({ completeTask:  jest.fn() }));
jest.unstable_mockModule('../../app/task_uc/transfer_task.uc.js', () => ({ transferTasks: jest.fn() }));

// ---------------------------------------------------------------------------
// Dynamic imports AFTER mocks are registered
// ---------------------------------------------------------------------------

const { createTask }    = await import('../../app/task_uc/create_task.uc.js');
const { getTaskById }   = await import('../../app/task_uc/get_task.uc.js');
const { listTasks }     = await import('../../app/task_uc/list_task.uc.js');
const { searchTasks }   = await import('../../app/task_uc/search_task.uc.js');
const { updateTask }    = await import('../../app/task_uc/update_task.uc.js');
const { deleteTask }    = await import('../../app/task_uc/delete_task.uc.js');
const { startTask }     = await import('../../app/task_uc/start_task.uc.js');
const { completeTask }  = await import('../../app/task_uc/complete_task.uc.js');
const { transferTasks } = await import('../../app/task_uc/transfer_task.uc.js');

const {
    createTaskController,
    getTaskByIdController,
    listTaskController,
    searchTaskController,
    updateTaskController,
    deleteTaskController,
    startTaskController,
    completeTaskController,
    transferTaskController,
} = await import('../../interfaces/table/task.controller.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
};

const mockReq   = (body = {}, params = {}, query = {}, user = { id: 'user-1' }) => ({ body, params, query, user });
const getBody   = (res) => res.json.mock.calls[0][0];
const getStatus = (res) => res.status.mock.calls[0][0];

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// input_sanitizer — pure functions, no mocks needed
// ---------------------------------------------------------------------------

const { sanitizeCreateInput, sanitizeUpdateInput } =
    await import('../../interfaces/table/task.input_sanitizer.js');

describe('sanitizeCreateInput', () => {
    it('keeps only allowed create fields', () => {
        const result = sanitizeCreateInput({
            title: 'My Task', description: 'desc', status: 'todo',
            priority: 'high', dueDate: '2025-01-01', hack: true,
        });
        expect(result).toEqual({
            title: 'My Task', description: 'desc', status: 'todo',
            priority: 'high', dueDate: '2025-01-01',
        });
    });

    it('strips unknown fields', () => {
        expect(sanitizeCreateInput({ title: 'Task', injected: true })).not.toHaveProperty('injected');
    });

    it('only includes fields present in the body', () => {
        const result = sanitizeCreateInput({ title: 'Task' });
        expect(result).toEqual({ title: 'Task' });
        expect(result).not.toHaveProperty('description');
    });

    it('returns empty object for empty body', () => {
        expect(sanitizeCreateInput({})).toEqual({});
    });

    it('returns empty object for null body', () => {
        expect(sanitizeCreateInput(null)).toEqual({});
    });

    it('returns empty object for non-object body', () => {
        expect(sanitizeCreateInput('string')).toEqual({});
    });
});

describe('sanitizeUpdateInput', () => {
    it('keeps only allowed update fields', () => {
        expect(sanitizeUpdateInput({ title: 'Updated', priority: 'low', extra: true }))
            .toEqual({ title: 'Updated', priority: 'low' });
    });

    it('strips unknown fields', () => {
        expect(sanitizeUpdateInput({ title: 'Task', unknown: 'x' })).not.toHaveProperty('unknown');
    });

    it('returns empty object for null body', () => {
        expect(sanitizeUpdateInput(null)).toEqual({});
    });
});

// ---------------------------------------------------------------------------
// createTaskController
// ---------------------------------------------------------------------------

describe('createTaskController', () => {
    it('passes sanitized body and user id to createTask', async () => {
        createTask.mockResolvedValue({ id: 't1' });
        await createTaskController(
            mockReq({ title: 'Task', priority: 'high', hack: 'x' }, {}, {}, { id: 'user-1' }),
            mockRes()
        );
        expect(createTask).toHaveBeenCalledWith('user-1', { title: 'Task', priority: 'high' });
    });

    it('strips unknown fields before calling use case', async () => {
        createTask.mockResolvedValue({});
        await createTaskController(
            mockReq({ title: 'Task', injected: true }, {}, {}, { id: 'user-1' }),
            mockRes()
        );
        expect(createTask.mock.calls[0][1]).not.toHaveProperty('injected');
    });

    it('responds 201 with the created task', async () => {
        const task = { id: 't1', title: 'Task' };
        createTask.mockResolvedValue(task);
        const res = mockRes();
        await createTaskController(
            mockReq({ title: 'Task', priority: 'high' }, {}, {}, { id: 'user-1' }),
            res
        );
        expect(getStatus(res)).toBe(201);
        expect(getBody(res)).toEqual({ success: true, data: task });
    });
});

// ---------------------------------------------------------------------------
// getTaskByIdController
// ---------------------------------------------------------------------------

describe('getTaskByIdController', () => {
    it('calls getTaskById with task id and user id', async () => {
        getTaskById.mockResolvedValue({ id: 't1' });
        await getTaskByIdController(mockReq({}, { id: 't1' }, {}, { id: 'user-1' }), mockRes());
        expect(getTaskById).toHaveBeenCalledWith('t1', 'user-1');
    });

    it('responds 200 with the task', async () => {
        const task = { id: 't1', title: 'Task' };
        getTaskById.mockResolvedValue(task);
        const res = mockRes();
        await getTaskByIdController(mockReq({}, { id: 't1' }, {}, { id: 'user-1' }), res);
        expect(getStatus(res)).toBe(200);
        expect(getBody(res)).toEqual({ success: true, data: task });
    });
});

// ---------------------------------------------------------------------------
// listTaskController
// ---------------------------------------------------------------------------

describe('listTaskController', () => {
    it('calls listTasks with no filters when query is empty', async () => {
        listTasks.mockResolvedValue([]);
        await listTaskController(mockReq({}, {}, {}, { id: 'user-1' }), mockRes());
        expect(listTasks).toHaveBeenCalledWith({}, expect.any(Object), 'user-1');
    });

    it('calls listTasks with status filter when provided', async () => {
        listTasks.mockResolvedValue([]);
        await listTaskController(mockReq({}, {}, { status: 'todo' }, { id: 'user-1' }), mockRes());
        expect(listTasks).toHaveBeenCalledWith({ status: 'todo' }, expect.any(Object), 'user-1');
    });

    it('calls listTasks with priority filter when provided', async () => {
        listTasks.mockResolvedValue([]);
        await listTaskController(mockReq({}, {}, { priority: 'high' }, { id: 'user-1' }), mockRes());
        expect(listTasks).toHaveBeenCalledWith({ priority: 'high' }, expect.any(Object), 'user-1');
    });

    it('calls listTasks with both filters when provided', async () => {
        listTasks.mockResolvedValue([]);
        await listTaskController(
            mockReq({}, {}, { status: 'in_progress', priority: 'low' }, { id: 'user-1' }),
            mockRes()
        );
        expect(listTasks).toHaveBeenCalledWith(
            { status: 'in_progress', priority: 'low' },
            expect.any(Object),
            'user-1'
        );
    });

    it('passes pagination and sort options', async () => {
        listTasks.mockResolvedValue([]);
        await listTaskController(
            mockReq({}, {}, { page: '2', limit: '5', sortBy: 'dueDate', sortOrder: 'asc' }, { id: 'user-1' }),
            mockRes()
        );
        expect(listTasks).toHaveBeenCalledWith(
            {},
            { page: '2', limit: '5', sortBy: 'dueDate', sortOrder: 'asc' },
            'user-1'
        );
    });

    it('responds 200 with the task list', async () => {
        const tasks = [{ id: 't1' }, { id: 't2' }];
        listTasks.mockResolvedValue(tasks);
        const res = mockRes();
        await listTaskController(mockReq({}, {}, {}, { id: 'user-1' }), res);
        expect(getStatus(res)).toBe(200);
        expect(getBody(res)).toEqual({ success: true, data: tasks });
    });
});

// ---------------------------------------------------------------------------
// searchTaskController
// ---------------------------------------------------------------------------

describe('searchTaskController', () => {
    it('calls searchTasks with query string and user id', async () => {
        searchTasks.mockResolvedValue([]);
        await searchTaskController(
            mockReq({}, {}, { q: 'bug fix', page: '1', limit: '10' }, { id: 'user-1' }),
            mockRes()
        );
        expect(searchTasks).toHaveBeenCalledWith('bug fix', { page: '1', limit: '10', sortBy: undefined, sortOrder: undefined }, 'user-1');
    });

    it('responds 200 with search results', async () => {
        const tasks = [{ id: 't1', title: 'bug fix' }];
        searchTasks.mockResolvedValue(tasks);
        const res = mockRes();
        await searchTaskController(mockReq({}, {}, { q: 'bug fix' }, { id: 'user-1' }), res);
        expect(getStatus(res)).toBe(200);
        expect(getBody(res)).toEqual({ success: true, data: tasks });
    });
});

// ---------------------------------------------------------------------------
// updateTaskController
// ---------------------------------------------------------------------------

describe('updateTaskController', () => {
    it('calls updateTask with id, sanitized updates, and user id', async () => {
        updateTask.mockResolvedValue({ id: 't1' });
        await updateTaskController(
            mockReq({ title: 'Updated', hack: 'x' }, { id: 't1' }, {}, { id: 'user-1' }),
            mockRes()
        );
        expect(updateTask).toHaveBeenCalledWith('t1', { title: 'Updated' }, 'user-1');
    });

    it('strips unknown fields from updates', async () => {
        updateTask.mockResolvedValue({});
        await updateTaskController(
            mockReq({ title: 'Updated', injected: true }, { id: 't1' }, {}, { id: 'user-1' }),
            mockRes()
        );
        const [, updates] = updateTask.mock.calls[0];
        expect(updates).not.toHaveProperty('injected');
    });

    it('responds 200 with the updated task', async () => {
        const task = { id: 't1', title: 'Updated' };
        updateTask.mockResolvedValue(task);
        const res = mockRes();
        await updateTaskController(
            mockReq({ title: 'Updated' }, { id: 't1' }, {}, { id: 'user-1' }),
            res
        );
        expect(getStatus(res)).toBe(200);
        expect(getBody(res)).toEqual({ success: true, data: task });
    });
});

// ---------------------------------------------------------------------------
// deleteTaskController
// ---------------------------------------------------------------------------

describe('deleteTaskController', () => {
    it('calls deleteTask with task id and user id', async () => {
        deleteTask.mockResolvedValue({ deleted: true });
        await deleteTaskController(mockReq({}, { id: 't99' }, {}, { id: 'user-1' }), mockRes());
        expect(deleteTask).toHaveBeenCalledWith('t99', 'user-1');
    });

    it('responds 200 with the result', async () => {
        const result = { deleted: true };
        deleteTask.mockResolvedValue(result);
        const res = mockRes();
        await deleteTaskController(mockReq({}, { id: 't99' }, {}, { id: 'user-1' }), res);
        expect(getStatus(res)).toBe(200);
        expect(getBody(res)).toEqual({ success: true, data: result });
    });
});

// ---------------------------------------------------------------------------
// startTaskController
// ---------------------------------------------------------------------------

describe('startTaskController', () => {
    it('calls startTask with task id and user id', async () => {
        startTask.mockResolvedValue({ id: 't1', status: 'in_progress' });
        await startTaskController(mockReq({}, { id: 't1' }, {}, { id: 'user-1' }), mockRes());
        expect(startTask).toHaveBeenCalledWith('t1', 'user-1');
    });

    it('responds 200 with the started task', async () => {
        const task = { id: 't1', status: 'in_progress' };
        startTask.mockResolvedValue(task);
        const res = mockRes();
        await startTaskController(mockReq({}, { id: 't1' }, {}, { id: 'user-1' }), res);
        expect(getStatus(res)).toBe(200);
        expect(getBody(res)).toEqual({ success: true, data: task });
    });
});

// ---------------------------------------------------------------------------
// completeTaskController
// ---------------------------------------------------------------------------

describe('completeTaskController', () => {
    it('calls completeTask with task id and user id', async () => {
        completeTask.mockResolvedValue({ id: 't1', status: 'done' });
        await completeTaskController(mockReq({}, { id: 't1' }, {}, { id: 'user-1' }), mockRes());
        expect(completeTask).toHaveBeenCalledWith('t1', 'user-1');
    });

    it('responds 200 with the completed task', async () => {
        const task = { id: 't1', status: 'done' };
        completeTask.mockResolvedValue(task);
        const res = mockRes();
        await completeTaskController(mockReq({}, { id: 't1' }, {}, { id: 'user-1' }), res);
        expect(getStatus(res)).toBe(200);
        expect(getBody(res)).toEqual({ success: true, data: task });
    });
});

// ---------------------------------------------------------------------------
// transferTaskController (admin only)
// ---------------------------------------------------------------------------

describe('transferTaskController', () => {
    it('calls transferTasks with fromUserId and toUserId', async () => {
        transferTasks.mockResolvedValue({ transferred: 3 });
        await transferTaskController(
            mockReq({ fromUserId: 'user-1', toUserId: 'user-2' }, {}, {}, { id: 'admin-1' }),
            mockRes()
        );
        expect(transferTasks).toHaveBeenCalledWith('user-1', 'user-2');
    });

    it('responds 200 with the transfer result', async () => {
        const result = { transferred: 3 };
        transferTasks.mockResolvedValue(result);
        const res = mockRes();
        await transferTaskController(
            mockReq({ fromUserId: 'user-1', toUserId: 'user-2' }, {}, {}, { id: 'admin-1' }),
            res
        );
        expect(getStatus(res)).toBe(200);
        expect(getBody(res)).toEqual({ success: true, data: result });
    });
});

// ---------------------------------------------------------------------------
// task router — route registration
// ---------------------------------------------------------------------------

const { default: router } = await import('../../interfaces/table/task.router.js');

describe('task router', () => {
    const getRoutes = (method) =>
        router.stack
            .filter((l) => l.route?.methods?.[method])
            .map((l) => l.route.path);

    it('registers POST /',              () => expect(getRoutes('post')).toContain('/'));
    it('registers GET /search',         () => expect(getRoutes('get')).toContain('/search'));
    it('registers GET /',               () => expect(getRoutes('get')).toContain('/'));
    it('registers GET /:id',            () => expect(getRoutes('get')).toContain('/:id'));
    it('registers PATCH /:id',          () => expect(getRoutes('patch')).toContain('/:id'));
    it('registers DELETE /:id',         () => expect(getRoutes('delete')).toContain('/:id'));
    it('registers PATCH /:id/start',    () => expect(getRoutes('patch')).toContain('/:id/start'));
    it('registers PATCH /:id/complete', () => expect(getRoutes('patch')).toContain('/:id/complete'));
    it('registers POST /transfer',      () => expect(getRoutes('post')).toContain('/transfer'));
});