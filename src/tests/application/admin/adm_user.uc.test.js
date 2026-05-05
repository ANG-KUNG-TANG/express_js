// src/tests/application/admin/adm_user.uc.test.js
import { jest } from '@jest/globals';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.unstable_mockModule('../../../infrastructure/repositories/user_repo.js', () => ({
    deleteUser:       jest.fn(),
    findUserByEmail:  jest.fn(),
    lisAllUsers:      jest.fn(),
    promoteToAdmin:   jest.fn(),
    findUserById:     jest.fn(),
    updateUser:       jest.fn(),
}));

jest.unstable_mockModule('../../../infrastructure/mapper/user.mapper.js', () => ({
    sanitizeUser: jest.fn((u) => ({ ...u, password: undefined })),
}));

jest.unstable_mockModule('../../../core/services/notification.service.js', () => ({
    NotificationService: {
        send:  jest.fn(),
        TYPES: { ROLE_CHANGED: 'role_changed', TEACHER_LINKED: 'teacher_linked' },
    },
}));

jest.unstable_mockModule('../../../core/services/redis.service.js', () => ({
    redisDel:  jest.fn(),
    CacheKeys: { teacherStudentList: (id) => `teacher:${id}:students` },
}));

jest.unstable_mockModule('../../../core/errors/base.errors.js', () => ({
    AppError:        class extends Error { constructor(m) { super(m); this.name = 'AppError'; } },
    NotFoundError:   class extends Error { constructor(m) { super(m); this.name = 'NotFoundError'; } },
    ValidationError: class extends Error { constructor(m) { super(m); this.name = 'ValidationError'; } },
    ForbiddenError:  class extends Error { constructor(m) { super(m); this.name = 'ForbiddenError'; } },
}));

jest.unstable_mockModule('../../../domain/base/user_enums.js', () => ({
    UserRole: { ADMIN: 'admin', TEACHER: 'teacher', USER: 'user' },
}));

jest.unstable_mockModule('../../../core/logger/logger.js', () => ({
    default: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ─── SUT imports ──────────────────────────────────────────────────────────────
const { adminDeleteUserUC }              = await import('../../../app/admin/adm_delete_user.uc.js');
const { adminGetUserByEmailUC }          = await import('../../../app/admin/adm_getby_mail.uc.js');
const { adminListUsersUC }               = await import('../../../app/admin/adm_list_user.uc.js');
const { adminPromoteUserUC }             = await import('../../../app/admin/adm_promote_user.uc.js');
const { adminAssignTeacherUC }           = await import('../../../app/admin/assign_teacher.uc.js');
const {
    adminLinkStudentToTeacherUC,
    adminUnlinkStudentFromTeacherUC,
} = await import('../../../app/admin/adm_link_student.uc.js');

const userRepo                = await import('../../../infrastructure/repositories/user_repo.js');
const { sanitizeUser }        = await import('../../../infrastructure/mapper/user.mapper.js');
const { NotificationService } = await import('../../../core/services/notification.service.js');
const { redisDel }            = await import('../../../core/services/redis.service.js');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const makeUser = (overrides = {}) => ({
    _id:              'user-1',
    id:               'user-1',
    _role:            'user',
    role:             'user',
    _name:            'Test User',
    _assignedTeacher: null,
    assignedTeacher:  null,
    ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('adminDeleteUserUC', () => {
    beforeEach(() => jest.clearAllMocks());

    it('calls deleteUser with the given userId', async () => {
        userRepo.deleteUser.mockResolvedValue({ deleted: true });
        await adminDeleteUserUC('user-1');
        expect(userRepo.deleteUser).toHaveBeenCalledWith('user-1');
    });

    it('returns the result from deleteUser', async () => {
        userRepo.deleteUser.mockResolvedValue({ deleted: true });
        const result = await adminDeleteUserUC('user-1');
        expect(result).toEqual({ deleted: true });
    });

    it('propagates errors from deleteUser', async () => {
        userRepo.deleteUser.mockRejectedValue(new Error('DB error'));
        await expect(adminDeleteUserUC('user-1')).rejects.toThrow('DB error');
    });
});

describe('adminGetUserByEmailUC', () => {
    beforeEach(() => jest.clearAllMocks());

    it('finds the user and returns a sanitized result', async () => {
        const raw = makeUser({ email: 'test@test.com', password: 'secret' });
        userRepo.findUserByEmail.mockResolvedValue(raw);
        sanitizeUser.mockReturnValue({ ...raw, password: undefined });

        const result = await adminGetUserByEmailUC('test@test.com');
        expect(userRepo.findUserByEmail).toHaveBeenCalledWith('test@test.com');
        expect(sanitizeUser).toHaveBeenCalledWith(raw);
        expect(result.password).toBeUndefined();
    });

    it('propagates errors when user is not found', async () => {
        userRepo.findUserByEmail.mockRejectedValue(new Error('Not found'));
        await expect(adminGetUserByEmailUC('x@x.com')).rejects.toThrow('Not found');
    });
});

describe('adminListUsersUC', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns sanitized list of all users', async () => {
        const users = [makeUser({ id: '1' }), makeUser({ id: '2' })];
        userRepo.lisAllUsers.mockResolvedValue(users);

        const result = await adminListUsersUC();
        expect(userRepo.lisAllUsers).toHaveBeenCalled();
        expect(sanitizeUser).toHaveBeenCalledTimes(2);
        expect(result).toHaveLength(2);
        // The mock of sanitizeUser returns { ...user, password: undefined }
        // so the password field should be stripped.
        expect(result[0].password).toBeUndefined();
        expect(result[1].password).toBeUndefined();
    });

    it('returns empty array when no users exist', async () => {
        userRepo.lisAllUsers.mockResolvedValue([]);
        const result = await adminListUsersUC();
        expect(result).toEqual([]);
    });
});

describe('adminPromoteUserUC', () => {
    beforeEach(() => jest.clearAllMocks());

    it('promotes a user and returns sanitized result', async () => {
        const promoted = makeUser({ _role: 'admin', role: 'admin' });
        userRepo.promoteToAdmin.mockResolvedValue(promoted);

        const result = await adminPromoteUserUC('admin-1', 'user-1');
        expect(userRepo.promoteToAdmin).toHaveBeenCalledWith('user-1');
        expect(result._role).toBe('user');
    });

    it('fires a ROLE_CHANGED notification', async () => {
        const promoted = makeUser({ _role: 'admin' });
        userRepo.promoteToAdmin.mockResolvedValue(promoted);

        await adminPromoteUserUC('admin-1', 'user-1');
        expect(NotificationService.send).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'role_changed', recipientId: 'user-1' })
        );
    });

    it('propagates errors from promoteToAdmin', async () => {
        userRepo.promoteToAdmin.mockRejectedValue(new Error('User not found'));
        await expect(adminPromoteUserUC('admin-1', 'bad-id')).rejects.toThrow('User not found');
    });
});

describe('adminAssignTeacherUC', () => {
    beforeEach(() => jest.clearAllMocks());

    it('assigns the teacher role to a regular user', async () => {
        userRepo.findUserById.mockResolvedValue(makeUser({ _role: 'user' }));
        userRepo.updateUser.mockResolvedValue(makeUser({ _role: 'teacher' }));

        const result = await adminAssignTeacherUC('user-1');
        expect(userRepo.updateUser).toHaveBeenCalledWith('user-1', { role: 'teacher' });
        expect(result._role).toBe('user');
    });

    it('throws UserAlreadyAdminError when trying to assign teacher role to an admin', async () => {
        userRepo.findUserById.mockResolvedValue(makeUser({ _role: 'admin' }));
        await expect(adminAssignTeacherUC('admin-id')).rejects.toMatchObject({ name: 'AppError' });
    });

    it('propagates errors when user is not found', async () => {
        userRepo.findUserById.mockRejectedValue(new Error('Not found'));
        await expect(adminAssignTeacherUC('bad-id')).rejects.toThrow('Not found');
    });
});

describe('adminLinkStudentToTeacherUC', () => {
    beforeEach(() => jest.clearAllMocks());

    const student = makeUser({ id: 'stu-1', _role: 'user', _assignedTeacher: null });
    const teacher = makeUser({ id: 'tch-1', _role: 'teacher', role: 'teacher' });

    it('links a student to a teacher and busts the cache', async () => {
        userRepo.findUserById
            .mockResolvedValueOnce(student)
            .mockResolvedValueOnce(teacher);
        userRepo.updateUser.mockResolvedValue({ ...student, assignedTeacher: 'tch-1' });

        await adminLinkStudentToTeacherUC('admin-1', 'stu-1', 'tch-1');

        expect(userRepo.updateUser).toHaveBeenCalledWith('stu-1', { assignedTeacher: 'tch-1' });
        expect(redisDel).toHaveBeenCalledWith('teacher:tch-1:students');
    });

    it('sends a TEACHER_LINKED notification to the student', async () => {
        userRepo.findUserById
            .mockResolvedValueOnce(student)
            .mockResolvedValueOnce(teacher);
        userRepo.updateUser.mockResolvedValue({});

        await adminLinkStudentToTeacherUC('admin-1', 'stu-1', 'tch-1');
        expect(NotificationService.send).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'teacher_linked', recipientId: 'stu-1' })
        );
    });

    it('also busts old teacher cache when student switches teachers', async () => {
        const studentWithOldTeacher = { ...student, _assignedTeacher: 'old-tch' };
        userRepo.findUserById
            .mockResolvedValueOnce(studentWithOldTeacher)
            .mockResolvedValueOnce(teacher);
        userRepo.updateUser.mockResolvedValue({});

        await adminLinkStudentToTeacherUC('admin-1', 'stu-1', 'tch-1');
        expect(redisDel).toHaveBeenCalledWith('teacher:old-tch:students');
        expect(redisDel).toHaveBeenCalledWith('teacher:tch-1:students');
    });

    it('throws ValidationError when teacherId is missing', async () => {
        await expect(
            adminLinkStudentToTeacherUC('admin-1', 'stu-1', undefined)
        ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('throws ForbiddenError when trying to link an admin as a student', async () => {
        userRepo.findUserById.mockResolvedValueOnce(makeUser({ _role: 'admin' }));
        await expect(
            adminLinkStudentToTeacherUC('admin-1', 'stu-1', 'tch-1')
        ).rejects.toMatchObject({ name: 'ForbiddenError' });
    });

    it('throws ForbiddenError when target teacher has wrong role', async () => {
        userRepo.findUserById
            .mockResolvedValueOnce(student)
            .mockResolvedValueOnce(makeUser({ _role: 'user', role: 'user' }));
        await expect(
            adminLinkStudentToTeacherUC('admin-1', 'stu-1', 'tch-1')
        ).rejects.toMatchObject({ name: 'ForbiddenError' });
    });
});

describe('adminUnlinkStudentFromTeacherUC', () => {
    beforeEach(() => jest.clearAllMocks());

    it('unlinks a student and busts the old teacher cache', async () => {
        const student = makeUser({ _assignedTeacher: 'tch-1' });
        userRepo.findUserById.mockResolvedValue(student);
        userRepo.updateUser.mockResolvedValue({ ...student, assignedTeacher: null });

        await adminUnlinkStudentFromTeacherUC('admin-1', 'user-1');

        expect(userRepo.updateUser).toHaveBeenCalledWith('user-1', { assignedTeacher: null });
        expect(redisDel).toHaveBeenCalledWith('teacher:tch-1:students');
    });

    it('sends a TEACHER_LINKED notification after unlinking', async () => {
        userRepo.findUserById.mockResolvedValue(makeUser({ _assignedTeacher: 'tch-1' }));
        userRepo.updateUser.mockResolvedValue({});

        await adminUnlinkStudentFromTeacherUC('admin-1', 'user-1');
        expect(NotificationService.send).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'teacher_linked', recipientId: 'user-1' })
        );
    });

    it('throws NotFoundError when student does not exist', async () => {
        userRepo.findUserById.mockResolvedValue(null);
        await expect(
            adminUnlinkStudentFromTeacherUC('admin-1', 'bad-id')
        ).rejects.toMatchObject({ name: 'NotFoundError' });
    });
});