// src/tests/application/profile/update_profile.uc.test.js

import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../infrastructure/repositories/user_repo.js', () => ({
    updateProfileInfo: jest.fn(),
}));

jest.unstable_mockModule('../../../app/validators/user_validator.js', () => ({
    validateRequired:     jest.fn(),
    validateStringLength: jest.fn(),
    validateEmail:        jest.fn(),
}));

jest.unstable_mockModule('../../../core/errors/user.errors.js', () => {
    const make = (name) => {
        const E = class extends Error {
            constructor(...args) { super(args.join(' ')); this.name = name; }
        };
        Object.defineProperty(E, 'name', { value: name });
        return E;
    };
    return { UserBioTooLongError: make('UserBioTooLongError') };
});

const userRepo = await import('../../../infrastructure/repositories/user_repo.js');
const { validateRequired, validateStringLength, validateEmail } = await import('../../../app/validators/user_validator.js');
const { UserBioTooLongError } = await import('../../../core/errors/user.errors.js');
const { updateProfileInfoUseCase, validateUpdateProfileInput } = await import('../../../app/profile/update_profile.uc.js');

const VALID_INPUT = { name: 'Jane Doe', email: 'JANE@EXAMPLE.COM', bio: 'Loves IELTS.' };

describe('updateProfileInfoUseCase', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('validateUpdateProfileInput', () => {
        it('validates name, email, and runs string-length check', () => {
            validateUpdateProfileInput(VALID_INPUT);
            expect(validateRequired).toHaveBeenCalledWith('Jane Doe', 'name');
            expect(validateRequired).toHaveBeenCalledWith('JANE@EXAMPLE.COM', 'email');
            expect(validateStringLength).toHaveBeenCalledWith('Jane Doe', 'name', 3, 100);
            expect(validateEmail).toHaveBeenCalledWith('JANE@EXAMPLE.COM');
        });

        it('throws UserBioTooLongError when bio exceeds 300 chars', () => {
            expect(() => validateUpdateProfileInput({ ...VALID_INPUT, bio: 'x'.repeat(301) }))
                .toThrow(UserBioTooLongError);
        });

        it('does NOT throw when bio is exactly 300 chars', () => {
            expect(() => validateUpdateProfileInput({ ...VALID_INPUT, bio: 'x'.repeat(300) }))
                .not.toThrow();
        });

        it('does NOT throw when bio is undefined', () => {
            expect(() => validateUpdateProfileInput({ name: 'Jane', email: 'j@e.com' }))
                .not.toThrow();
        });
    });

    it('trims name before passing to repo', async () => {
        userRepo.updateProfileInfo.mockResolvedValue({});
        await updateProfileInfoUseCase('user-1', { ...VALID_INPUT, name: '  Jane  ' });
        expect(userRepo.updateProfileInfo.mock.calls[0][1].name).toBe('Jane');
    });

    it('lowercases email before passing to repo', async () => {
        userRepo.updateProfileInfo.mockResolvedValue({});
        await updateProfileInfoUseCase('user-1', VALID_INPUT);
        expect(userRepo.updateProfileInfo.mock.calls[0][1].email).toBe('jane@example.com');
    });

    it('trims bio and passes it to repo', async () => {
        userRepo.updateProfileInfo.mockResolvedValue({});
        await updateProfileInfoUseCase('user-1', { ...VALID_INPUT, bio: '  Hello.  ' });
        expect(userRepo.updateProfileInfo.mock.calls[0][1].bio).toBe('Hello.');
    });

    it('sets bio to empty string when omitted', async () => {
        userRepo.updateProfileInfo.mockResolvedValue({});
        await updateProfileInfoUseCase('user-1', { name: 'Jane', email: 'j@e.com' });
        expect(userRepo.updateProfileInfo.mock.calls[0][1].bio).toBe('');
    });

    it('passes targetBand and examDate through to repo', async () => {
        userRepo.updateProfileInfo.mockResolvedValue({});
        await updateProfileInfoUseCase('user-1', { ...VALID_INPUT, targetBand: 7.5, examDate: '2025-09-01' });
        const repoArg = userRepo.updateProfileInfo.mock.calls[0][1];
        expect(repoArg.targetBand).toBe(7.5);
        expect(repoArg.examDate).toBe('2025-09-01');
    });

    it('sets targetBand and examDate to null when omitted', async () => {
        userRepo.updateProfileInfo.mockResolvedValue({});
        await updateProfileInfoUseCase('user-1', VALID_INPUT);
        const repoArg = userRepo.updateProfileInfo.mock.calls[0][1];
        expect(repoArg.targetBand).toBeNull();
        expect(repoArg.examDate).toBeNull();
    });

    it('returns the repo result', async () => {
        const updated = { _id: 'user-1', name: 'Jane Doe' };
        userRepo.updateProfileInfo.mockResolvedValue(updated);
        const result = await updateProfileInfoUseCase('user-1', VALID_INPUT);
        expect(result).toBe(updated);
    });
});