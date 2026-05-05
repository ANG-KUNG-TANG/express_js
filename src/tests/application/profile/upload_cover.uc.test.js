// src/tests/application/profile/upload_cover.uc.test.js

import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../infrastructure/repositories/user_repo.js', () => ({
    updateCoverUrl: jest.fn(),
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
        UserInvalidCoverTypeError: make('UserInvalidCoverTypeError'),
        UserCoverTooLargeError:    make('UserCoverTooLargeError'),
    };
});

const userRepo = await import('../../../infrastructure/repositories/user_repo.js');
const { UserInvalidCoverTypeError, UserCoverTooLargeError } = await import('../../../core/errors/user.errors.js');
const { uploadCoverUseCase, validateCoverInput } = await import('../../../app/profile/upload_cover.uc.js');

const VALID_FILE = { mimetype: 'image/webp', size: 2 * 1024 * 1024 };
const COVER_URL  = 'https://cdn.example.com/covers/user-1.webp';

describe('uploadCoverUseCase', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('validateCoverInput', () => {
        it('accepts all allowed image MIME types', () => {
            ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].forEach((mimetype) => {
                expect(() => validateCoverInput({ mimetype, size: 100 })).not.toThrow();
            });
        });

        it('throws UserInvalidCoverTypeError for a disallowed MIME type', () => {
            expect(() => validateCoverInput({ mimetype: 'video/mp4', size: 100 }))
                .toThrow(UserInvalidCoverTypeError);
        });

        it('throws UserCoverTooLargeError when file exceeds 5 MB', () => {
            expect(() => validateCoverInput({ mimetype: 'image/jpeg', size: 5 * 1024 * 1024 + 1 }))
                .toThrow(UserCoverTooLargeError);
        });

        it('does NOT throw when file is exactly 5 MB', () => {
            expect(() => validateCoverInput({ mimetype: 'image/jpeg', size: 5 * 1024 * 1024 }))
                .not.toThrow();
        });
    });

    it('calls repo.updateCoverUrl with userId and coverUrl', async () => {
        userRepo.updateCoverUrl.mockResolvedValue({ coverUrl: COVER_URL });
        await uploadCoverUseCase('user-1', { ...VALID_FILE, coverUrl: COVER_URL });
        expect(userRepo.updateCoverUrl).toHaveBeenCalledWith('user-1', COVER_URL);
    });

    it('returns the repo result', async () => {
        const saved = { coverUrl: COVER_URL };
        userRepo.updateCoverUrl.mockResolvedValue(saved);
        const result = await uploadCoverUseCase('user-1', { ...VALID_FILE, coverUrl: COVER_URL });
        expect(result).toBe(saved);
    });

    it('does NOT call repo when MIME type is invalid', async () => {
        await expect(
            uploadCoverUseCase('user-1', { mimetype: 'application/zip', size: 100, coverUrl: COVER_URL })
        ).rejects.toThrow(UserInvalidCoverTypeError);
        expect(userRepo.updateCoverUrl).not.toHaveBeenCalled();
    });

    it('does NOT call repo when file is too large', async () => {
        await expect(
            uploadCoverUseCase('user-1', { mimetype: 'image/gif', size: 99 * 1024 * 1024, coverUrl: COVER_URL })
        ).rejects.toThrow(UserCoverTooLargeError);
        expect(userRepo.updateCoverUrl).not.toHaveBeenCalled();
    });
});