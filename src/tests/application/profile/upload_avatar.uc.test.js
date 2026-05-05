// src/tests/application/profile/upload_avatar.uc.test.js

import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../infrastructure/repositories/user_repo.js', () => ({
    updateAvatarUrl: jest.fn(),
}));

jest.unstable_mockModule('../../../app/validators/user_validator.js', () => ({
    validateRequired: jest.fn(),
}));

jest.unstable_mockModule('../../../core/errors/user.errors.js', () => {
    const make = (name) => {
        const E = class extends Error {
            constructor(...args) { super(args.join(' ')); this.name = name; }
        };
        Object.defineProperty(E, 'name', { value: name });
        return E;
    };
    return {
        UserInvalidAvatarTypeError: make('UserInvalidAvatarTypeError'),
        UserAvatarTooLargeError:    make('UserAvatarTooLargeError'),
    };
});

const userRepo = await import('../../../infrastructure/repositories/user_repo.js');
const { UserInvalidAvatarTypeError, UserAvatarTooLargeError } = await import('../../../core/errors/user.errors.js');
const { uploadAvatarUseCase, validateAvatarInput } = await import('../../../app/profile/upload_avatar.uc.js');

const VALID_FILE = { mimetype: 'image/jpeg', size: 1024 * 1024 };
const AVATAR_URL = 'https://cdn.example.com/avatars/user-1.jpg';

describe('uploadAvatarUseCase', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('validateAvatarInput', () => {
        it('accepts all allowed image MIME types', () => {
            ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].forEach((mimetype) => {
                expect(() => validateAvatarInput({ mimetype, size: 100 })).not.toThrow();
            });
        });

        it('throws UserInvalidAvatarTypeError for a disallowed MIME type', () => {
            expect(() => validateAvatarInput({ mimetype: 'application/pdf', size: 100 }))
                .toThrow(UserInvalidAvatarTypeError);
        });

        it('throws UserAvatarTooLargeError when file exceeds 5 MB', () => {
            expect(() => validateAvatarInput({ mimetype: 'image/png', size: 5 * 1024 * 1024 + 1 }))
                .toThrow(UserAvatarTooLargeError);
        });

        it('does NOT throw when file is exactly 5 MB', () => {
            expect(() => validateAvatarInput({ mimetype: 'image/png', size: 5 * 1024 * 1024 }))
                .not.toThrow();
        });
    });

    it('calls repo.updateAvatarUrl with userId and avatarUrl', async () => {
        userRepo.updateAvatarUrl.mockResolvedValue({ avatarUrl: AVATAR_URL });
        await uploadAvatarUseCase('user-1', { ...VALID_FILE, avatarUrl: AVATAR_URL });
        expect(userRepo.updateAvatarUrl).toHaveBeenCalledWith('user-1', AVATAR_URL);
    });

    it('returns the repo result', async () => {
        const saved = { avatarUrl: AVATAR_URL };
        userRepo.updateAvatarUrl.mockResolvedValue(saved);
        const result = await uploadAvatarUseCase('user-1', { ...VALID_FILE, avatarUrl: AVATAR_URL });
        expect(result).toBe(saved);
    });

    it('does NOT call repo when MIME type is invalid', async () => {
        await expect(
            uploadAvatarUseCase('user-1', { mimetype: 'text/plain', size: 100, avatarUrl: AVATAR_URL })
        ).rejects.toThrow(UserInvalidAvatarTypeError);
        expect(userRepo.updateAvatarUrl).not.toHaveBeenCalled();
    });

    it('does NOT call repo when file is too large', async () => {
        await expect(
            uploadAvatarUseCase('user-1', { mimetype: 'image/png', size: 99 * 1024 * 1024, avatarUrl: AVATAR_URL })
        ).rejects.toThrow(UserAvatarTooLargeError);
        expect(userRepo.updateAvatarUrl).not.toHaveBeenCalled();
    });
});