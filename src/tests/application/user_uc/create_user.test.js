import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../infrastructure/repositories/user_repo.js', () => ({
    createUser: jest.fn(),
}));

jest.unstable_mockModule('../../../app/validators/password_hash.js', () => ({
    hashPassword: jest.fn(),
}));

jest.unstable_mockModule('../../../domain/entities/user_entity.js', () => ({
    User: jest.fn().mockImplementation((props) => ({
        _name: props.name,
        _email: props.email,
        _password: props.password,
        _role: props.role,
        _createdAt: new Date(),
        _updatedAt: new Date(),
    })),
}));

const { createUserUsecase } = await import('../../../app/user_uc/create_user.uc.js');
const userRepo = await import('../../../infrastructure/repositories/user_repo.js');
const passwordHash = await import('../../../app/validators/password_hash.js');
const { UserRole } = await import('../../../domain/base/user_enums.js');
const {
    UserNameRequiredError,
    UserNameTooShortError,
    UserNameTooLongError,
    UserInvalidEmailError,
    UserPasswordTooWeakError,
    UserInvalidRoleError,
} = await import('../../../core/errors/user.errors.js');

describe('createUserUseCase', () => {
    const validInput = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'secure123',
        role: UserRole.USER,
    };

    const mockCreatedUser = {
        id: 'user-1',
        _name: 'John Doe',
        _email: 'john@example.com',
        _role: UserRole.USER,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        passwordHash.hashPassword.mockReturnValue('hashed:password');
        userRepo.createUser.mockResolvedValue(mockCreatedUser);
    });

    it('should create a user successfully with valid input', async () => {
        const result = await createUserUsecase(validInput);
        expect(userRepo.createUser).toHaveBeenCalledTimes(1);
        expect(result).toBe(mockCreatedUser);
    });

    it('should hash the password before passing to entity', async () => {
        await createUserUsecase(validInput);
        expect(passwordHash.hashPassword).toHaveBeenCalledWith(validInput.password);
        const calledWith = userRepo.createUser.mock.calls[0][0];
        expect(calledWith._password).toBe('hashed:password');
    });

    it('should trim name and lowercase email before passing to entity', async () => {
        await createUserUsecase({ ...validInput, name: '  John Doe  ', email: 'JOHN@EXAMPLE.COM' });
        const calledWith = userRepo.createUser.mock.calls[0][0];
        expect(calledWith._name).toBe('John Doe');
        expect(calledWith._email).toBe('john@example.com');
    });

    it('should default role to USER when role is not provided', async () => {
        const { role, ...withoutRole } = validInput;
        await createUserUsecase(withoutRole);
        const calledWith = userRepo.createUser.mock.calls[0][0];
        expect(calledWith._role).toBe(UserRole.USER);
    });

    it('should throw UserNameRequiredError when name is empty', async () => {
        await expect(createUserUsecase({ ...validInput, name: '' })).rejects.toThrow(UserNameRequiredError);
    });

    it('should throw UserNameRequiredError when name is null', async () => {
        await expect(createUserUsecase({ ...validInput, name: null })).rejects.toThrow(UserNameRequiredError);
    });

    it('should throw UserNameTooShortError when name is too short', async () => {
        await expect(createUserUsecase({ ...validInput, name: 'ab' })).rejects.toThrow(UserNameTooShortError);
    });

    it('should throw UserNameTooLongError when name exceeds max length', async () => {
        await expect(createUserUsecase({ ...validInput, name: 'a'.repeat(101) })).rejects.toThrow(UserNameTooLongError);
    });

    it('should throw UserInvalidEmailError when email is empty', async () => {
        await expect(createUserUsecase({ ...validInput, email: '' })).rejects.toThrow(UserInvalidEmailError);
    });

    it('should throw UserInvalidEmailError when email format is invalid', async () => {
        await expect(createUserUsecase({ ...validInput, email: 'not-an-email' })).rejects.toThrow(UserInvalidEmailError);
    });

    it('should throw UserPasswordTooWeakError when password is too short', async () => {
        await expect(createUserUsecase({ ...validInput, password: '123' })).rejects.toThrow(UserPasswordTooWeakError);
    });

    it('should throw UserPasswordTooWeakError when password is empty', async () => {
        await expect(createUserUsecase({ ...validInput, password: '' })).rejects.toThrow(UserPasswordTooWeakError);
    });

    it('should throw UserInvalidRoleError when role is invalid', async () => {
        await expect(createUserUsecase({ ...validInput, role: 'SUPERUSER' })).rejects.toThrow(UserInvalidRoleError);
    });

    it('should not throw when role is undefined', async () => {
        await expect(createUserUsecase({ ...validInput, role: undefined })).resolves.toBeDefined();
    });
});