import { jest, beforeEach, describe, it, expect } from "@jest/globals";

// ---------------------------------------------------------------------------
// ESM mocks — must use jest.unstable_mockModule BEFORE dynamic imports
// ---------------------------------------------------------------------------

jest.unstable_mockModule('../../app/user_uc/create_user.uc.js',  () => ({ createUserUsecase:            jest.fn() }));
jest.unstable_mockModule('../../app/user_uc/auth_User.uc.js',    () => ({ authenticateUserUseCase:       jest.fn() }));
jest.unstable_mockModule('../../app/user_uc/get_user.uc.js',     () => ({ getUseByIdUc:                 jest.fn(), getUserByEamilUc: jest.fn() }));
jest.unstable_mockModule('../../app/user_uc/update_use.uc.js',   () => ({ updateUserUseCase:             jest.fn() }));
jest.unstable_mockModule('../../app/user_uc/delete_user.uc.js',  () => ({ deleteUserUc:                 jest.fn() }));
jest.unstable_mockModule('../../app/user_uc/promote_user.uc.js', () => ({ promoteUserToAdminUseCase:    jest.fn() }));

// ---------------------------------------------------------------------------
// Dynamic imports AFTER mocks are registered
// ---------------------------------------------------------------------------

const { createUserUsecase }          = await import('../../app/user_uc/create_user.uc.js');
const { authenticateUserUseCase }    = await import('../../app/user_uc/auth_User.uc.js');
const { getUseByIdUc,
        getUserByEamilUc }           = await import('../../app/user_uc/get_user.uc.js');
const { updateUserUseCase }          = await import('../../app/user_uc/update_use.uc.js');
const { deleteUserUc }               = await import('../../app/user_uc/delete_user.uc.js');
const { promoteUserToAdminUseCase }  = await import('../../app/user_uc/promote_user.uc.js');

const {
    createUser,
    loginUser,
    getUserById,
    getUserByEamil,
    updateUser,
    deleteUser,
    promoteUser,
} = await import('../../interfaces/table/user.controller.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
};

const mockReq   = (body = {}, params = {}) => ({ body, params });
const getBody   = (res) => res.json.mock.calls[0][0];
const getStatus = (res) => res.status.mock.calls[0][0];

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// input_sanitizer — pure functions, no mocks needed
// ---------------------------------------------------------------------------

const { sanitizeCreateInput, sanitizeUpdateInput, sanitizeAuthInput } =
    await import('../../interfaces/table/user.input_sanitizer.js');

describe('sanitizeCreateInput', () => {
    it('keeps only allowed create fields', () => {
        const result = sanitizeCreateInput({ name: 'Alice', email: 'a@b.com', password: 'secret123', role: 'user', hack: true });
        expect(result).toEqual({ name: 'Alice', email: 'a@b.com', password: 'secret123', role: 'user' });
    });

    it('strips unknown fields', () => {
        expect(sanitizeCreateInput({ name: 'Alice', injected: true })).not.toHaveProperty('injected');
    });

    it('only includes fields present in the body', () => {
        const result = sanitizeCreateInput({ name: 'Alice' });
        expect(result).toEqual({ name: 'Alice' });
        expect(result).not.toHaveProperty('email');
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
        expect(sanitizeUpdateInput({ name: 'Bob', email: 'b@c.com', extra: true }))
            .toEqual({ name: 'Bob', email: 'b@c.com' });
    });

    it('strips unknown fields', () => {
        expect(sanitizeUpdateInput({ password: 'new', unknown: 'x' })).not.toHaveProperty('unknown');
    });

    it('returns empty object for null body', () => {
        expect(sanitizeUpdateInput(null)).toEqual({});
    });
});

describe('sanitizeAuthInput', () => {
    it('keeps only email and password', () => {
        expect(sanitizeAuthInput({ email: 'a@b.com', password: 'pass', name: 'Alice', role: 'admin' }))
            .toEqual({ email: 'a@b.com', password: 'pass' });
    });

    it('strips name and role', () => {
        const result = sanitizeAuthInput({ email: 'x', password: 'y', role: 'admin' });
        expect(result).not.toHaveProperty('role');
        expect(result).not.toHaveProperty('name');
    });

    it('returns empty object for null body', () => {
        expect(sanitizeAuthInput(null)).toEqual({});
    });
});

// ---------------------------------------------------------------------------
// createUser
// ---------------------------------------------------------------------------

describe('createUser', () => {
    it('passes sanitized body to createUserUsecase', async () => {
        createUserUsecase.mockResolvedValue({ id: '1' });
        await createUser(mockReq({ name: 'Alice', email: 'a@b.com', password: 'secret123', hack: 'x' }), mockRes());
        expect(createUserUsecase).toHaveBeenCalledWith({ name: 'Alice', email: 'a@b.com', password: 'secret123' });
    });

    it('strips unknown fields before calling use case', async () => {
        createUserUsecase.mockResolvedValue({});
        await createUser(mockReq({ name: 'Alice', email: 'a@b.com', password: 'secret123', injected: true }), mockRes());
        expect(createUserUsecase.mock.calls[0][0]).not.toHaveProperty('injected');
    });

    it('responds 201 with the created user', async () => {
        const user = { id: '1', name: 'Alice' };
        createUserUsecase.mockResolvedValue(user);
        const res = mockRes();
        await createUser(mockReq({ name: 'Alice', email: 'a@b.com', password: 'secret123' }), res);
        expect(getStatus(res)).toBe(201);
        expect(getBody(res)).toEqual({ success: true, data: user });
    });
});

// ---------------------------------------------------------------------------
// loginUser
// ---------------------------------------------------------------------------

describe('loginUser', () => {
    it('passes sanitized body to authenticateUserUseCase', async () => {
        authenticateUserUseCase.mockResolvedValue({ token: 'abc' });
        await loginUser(mockReq({ email: 'a@b.com', password: 'pass', extra: 'x' }), mockRes());
        expect(authenticateUserUseCase).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass' });
    });

    it('strips non-auth fields', async () => {
        authenticateUserUseCase.mockResolvedValue({});
        await loginUser(mockReq({ email: 'a@b.com', password: 'pass', name: 'Alice' }), mockRes());
        expect(authenticateUserUseCase.mock.calls[0][0]).not.toHaveProperty('name');
    });

    it('responds 200 with the token payload', async () => {
        const payload = { token: 'abc' };
        authenticateUserUseCase.mockResolvedValue(payload);
        const res = mockRes();
        await loginUser(mockReq({ email: 'a@b.com', password: 'pass' }), res);
        expect(getStatus(res)).toBe(200);
        expect(getBody(res)).toEqual({ success: true, data: payload });
    });
});

// ---------------------------------------------------------------------------
// getUserById
// ---------------------------------------------------------------------------

describe('getUserById', () => {
    it('calls getUseByIdUc with the id param', async () => {
        getUseByIdUc.mockResolvedValue({ id: '42' });
        await getUserById(mockReq({}, { id: '42' }), mockRes());
        expect(getUseByIdUc).toHaveBeenCalledWith('42');
    });

    it('responds 200 with the user', async () => {
        const user = { id: '42', name: 'Bob' };
        getUseByIdUc.mockResolvedValue(user);
        const res = mockRes();
        await getUserById(mockReq({}, { id: '42' }), res);
        expect(getStatus(res)).toBe(200);
        expect(getBody(res)).toEqual({ success: true, data: user });
    });
});

// ---------------------------------------------------------------------------
// getUserByEamil
// ---------------------------------------------------------------------------

describe('getUserByEamil', () => {
    it('calls getUserByEamilUc with the email param', async () => {
        getUserByEamilUc.mockResolvedValue({ id: '1' });
        await getUserByEamil(mockReq({}, { email: 'a@b.com' }), mockRes());
        expect(getUserByEamilUc).toHaveBeenCalledWith('a@b.com');
    });

    it('responds 200 with the user', async () => {
        const user = { id: '1', email: 'a@b.com' };
        getUserByEamilUc.mockResolvedValue(user);
        const res = mockRes();
        await getUserByEamil(mockReq({}, { email: 'a@b.com' }), res);
        expect(getStatus(res)).toBe(200);
        expect(getBody(res)).toEqual({ success: true, data: user });
    });
});

// ---------------------------------------------------------------------------
// updateUser
// ---------------------------------------------------------------------------

describe('updateUser', () => {
    it('calls updateUserUseCase with id and sanitized updates', async () => {
        updateUserUseCase.mockResolvedValue({ id: '1' });
        await updateUser(mockReq({ name: 'Bob', hack: 'x' }, { id: '1' }), mockRes());
        expect(updateUserUseCase).toHaveBeenCalledWith('1', { name: 'Bob' });
    });

    it('strips unknown fields from updates', async () => {
        updateUserUseCase.mockResolvedValue({});
        await updateUser(mockReq({ name: 'Bob', injected: true }, { id: '1' }), mockRes());
        const [, updates] = updateUserUseCase.mock.calls[0];
        expect(updates).not.toHaveProperty('injected');
    });

    it('responds 200 with the updated user', async () => {
        const user = { id: '1', name: 'Bob' };
        updateUserUseCase.mockResolvedValue(user);
        const res = mockRes();
        await updateUser(mockReq({ name: 'Bob' }, { id: '1' }), res);
        expect(getStatus(res)).toBe(200);
        expect(getBody(res)).toEqual({ success: true, data: user });
    });
});

// ---------------------------------------------------------------------------
// deleteUser
// ---------------------------------------------------------------------------

describe('deleteUser', () => {
    it('calls deleteUserUc with the id param', async () => {
        deleteUserUc.mockResolvedValue({ deleted: true });
        await deleteUser(mockReq({}, { id: '99' }), mockRes());
        expect(deleteUserUc).toHaveBeenCalledWith('99');
    });

    it('responds 200 with the result', async () => {
        const result = { deleted: true };
        deleteUserUc.mockResolvedValue(result);
        const res = mockRes();
        await deleteUser(mockReq({}, { id: '99' }), res);
        expect(getStatus(res)).toBe(200);
        expect(getBody(res)).toEqual({ success: true, data: result });
    });
});

// ---------------------------------------------------------------------------
// promoteUser
// ---------------------------------------------------------------------------

describe('promoteUser', () => {
    it('calls promoteUserToAdminUseCase with the id param', async () => {
        promoteUserToAdminUseCase.mockResolvedValue({ id: '5', role: 'admin' });
        await promoteUser(mockReq({}, { id: '5' }), mockRes());
        expect(promoteUserToAdminUseCase).toHaveBeenCalledWith('5');
    });

    it('responds 200 with the promoted user', async () => {
        const user = { id: '5', role: 'admin' };
        promoteUserToAdminUseCase.mockResolvedValue(user);
        const res = mockRes();
        await promoteUser(mockReq({}, { id: '5' }), res);
        expect(getStatus(res)).toBe(200);
        expect(getBody(res)).toEqual({ success: true, data: user });
    });
});

// ---------------------------------------------------------------------------
// user router — route registration
// ---------------------------------------------------------------------------

const { default: router } = await import('../../interfaces/table/user.router.js');

describe('user router', () => {
    const getRoutes = (method) =>
        router.stack
            .filter((l) => l.route?.methods?.[method])
            .map((l) => l.route.path);

    it('registers POST /auth/login',         () => expect(getRoutes('post')).toContain('/auth/login'));
    it('registers POST /users',              () => expect(getRoutes('post')).toContain('/users'));
    it('registers GET /users/email/:email',  () => expect(getRoutes('get')).toContain('/users/email/:email'));
    it('registers GET /users/:id',           () => expect(getRoutes('get')).toContain('/users/:id'));
    it('registers PATCH /users/:id/promote', () => expect(getRoutes('patch')).toContain('/users/:id/promote'));
    it('registers PATCH /users/:id',         () => expect(getRoutes('patch')).toContain('/users/:id'));
    it('registers DELETE /users/:id',        () => expect(getRoutes('delete')).toContain('/users/:id'));
});