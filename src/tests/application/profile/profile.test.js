// src/tests/application/profile/profile.test.js

import { jest } from '@jest/globals';

// ═════════════════════════════════════════════════════════════════════════════
// Mocks
// ═════════════════════════════════════════════════════════════════════════════

jest.mock('../../../infrastructure/repositories/user_repo.js', () => ({
    getAttachments:    jest.fn(),
    removeAttachment:  jest.fn(),
    updateProfileInfo: jest.fn(),
    updateAvatarUrl:   jest.fn(),
    updateCoverUrl:    jest.fn(),
    addAttachment:     jest.fn(),
}));

jest.mock('../../../app/validators/user_validator.js', () => ({
    validateRequired:     jest.fn(),
    validateStringLength: jest.fn(),
    validateEmail:        jest.fn(),
}));

jest.mock('../../../core/errors/user.errors.js', () => {
    const make = (name) => {
        const E = class extends Error {
            constructor(...args) { super(args.join(' ')); this.name = name; }
        };
        Object.defineProperty(E, 'name', { value: name });
        return E;
    };
    return {
        UserFileNotFoundError:      make('UserFileNotFoundError'),
        UserBioTooLongError:        make('UserBioTooLongError'),
        UserInvalidAvatarTypeError: make('UserInvalidAvatarTypeError'),
        UserAvatarTooLargeError:    make('UserAvatarTooLargeError'),
        UserInvalidCoverTypeError:  make('UserInvalidCoverTypeError'),
        UserCoverTooLargeError:     make('UserCoverTooLargeError'),
        UserInvalidFileTypeError:   make('UserInvalidFileTypeError'),
        UserFileTooLargeError:      make('UserFileTooLargeError'),
    };
});

// ─── Lazy imports ─────────────────────────────────────────────────────────────

const userRepo = await import('../../../infrastructure/repositories/user_repo.js');
const { validateRequired, validateStringLength, validateEmail } =
    await import('../../../app/validators/user_validator.js');
const {
    UserFileNotFoundError,
    UserBioTooLongError,
    UserInvalidAvatarTypeError,
    UserAvatarTooLargeError,
    UserInvalidCoverTypeError,
    UserCoverTooLargeError,
    UserInvalidFileTypeError,
    UserFileTooLargeError,
} = await import('../../../core/errors/user.errors.js');

const { deleteFileUseCase, validateDeleteFileInput } =
    await import('../../../app/profile/delete_file.uc.js');
const { getFilesUseCase, validateGetFilesInput } =
    await import('../../../app/profile/get_file.uc.js');
const { updateProfileInfoUseCase, validateUpdateProfileInput } =
    await import('../../../app/profile/update_profile.uc.js');
const { uploadAvatarUseCase, validateAvatarInput } =
    await import('../../../app/profile/upload_avatar.uc.js');
const { uploadCoverUseCase, validateCoverInput } =
    await import('../../../app/profile/upload_cover.uc.js');
const { uploadFileUseCase, validateFileInput } =
    await import('../../../app/profile/upload_file.uc.js');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeAttachment = (id = 'file-1', overrides = {}) => ({
    _id:          { toString: () => id },
    originalName: 'report.pdf',
    mimeType:     'application/pdf',
    size:         1024,
    url:          `https://cdn.example.com/${id}`,
    ...overrides,
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. deleteFileUseCase
// ═════════════════════════════════════════════════════════════════════════════
describe('deleteFileUseCase', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('validateDeleteFileInput', () => {
        it('calls validateRequired for both userId and fileId', () => {
            validateDeleteFileInput({ userId: 'u1', fileId: 'f1' });
            expect(validateRequired).toHaveBeenCalledWith('u1', 'userId');
            expect(validateRequired).toHaveBeenCalledWith('f1', 'fileId');
        });
    });

    it('returns repo result when file belongs to user', async () => {
        userRepo.getAttachments.mockResolvedValue([makeAttachment('file-1')]);
        userRepo.removeAttachment.mockResolvedValue({ removed: true });

        const result = await deleteFileUseCase('user-1', 'file-1');
        expect(result).toEqual({ removed: true });
    });

    it('calls repo.removeAttachment with correct userId and fileId', async () => {
        userRepo.getAttachments.mockResolvedValue([makeAttachment('file-99')]);
        userRepo.removeAttachment.mockResolvedValue({});

        await deleteFileUseCase('user-1', 'file-99');
        expect(userRepo.removeAttachment).toHaveBeenCalledWith('user-1', 'file-99');
    });

    it('throws UserFileNotFoundError when fileId is not in user attachments', async () => {
        userRepo.getAttachments.mockResolvedValue([makeAttachment('other-file')]);
        await expect(deleteFileUseCase('user-1', 'missing-file')).rejects.toThrow(UserFileNotFoundError);
    });

    it('throws UserFileNotFoundError when user has no attachments', async () => {
        userRepo.getAttachments.mockResolvedValue([]);
        await expect(deleteFileUseCase('user-1', 'file-1')).rejects.toThrow(UserFileNotFoundError);
    });

    it('does NOT call removeAttachment when file is not found', async () => {
        userRepo.getAttachments.mockResolvedValue([]);
        await expect(deleteFileUseCase('user-1', 'ghost')).rejects.toThrow();
        expect(userRepo.removeAttachment).not.toHaveBeenCalled();
    });

    it('matches fileId using toString() on attachment._id', async () => {
        userRepo.getAttachments.mockResolvedValue([makeAttachment('mongo-object-id')]);
        userRepo.removeAttachment.mockResolvedValue({});
        await expect(deleteFileUseCase('user-1', 'mongo-object-id')).resolves.not.toThrow();
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. getFilesUseCase
// ═════════════════════════════════════════════════════════════════════════════
describe('getFilesUseCase', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('validateGetFilesInput', () => {
        it('calls validateRequired for userId', () => {
            validateGetFilesInput({ userId: 'u1' });
            expect(validateRequired).toHaveBeenCalledWith('u1', 'userId');
        });
    });

    it('returns the list of attachments from the repo', async () => {
        const attachments = [makeAttachment('f1'), makeAttachment('f2')];
        userRepo.getAttachments.mockResolvedValue(attachments);

        const result = await getFilesUseCase('user-1');
        expect(result).toBe(attachments);
    });

    it('calls repo.getAttachments with the correct userId', async () => {
        userRepo.getAttachments.mockResolvedValue([]);
        await getFilesUseCase('user-42');
        expect(userRepo.getAttachments).toHaveBeenCalledWith('user-42');
    });

    it('returns an empty array when the user has no attachments', async () => {
        userRepo.getAttachments.mockResolvedValue([]);
        const result = await getFilesUseCase('user-1');
        expect(result).toEqual([]);
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. updateProfileInfoUseCase
// ═════════════════════════════════════════════════════════════════════════════
describe('updateProfileInfoUseCase', () => {
    const VALID_INPUT = { name: 'Jane Doe', email: 'JANE@EXAMPLE.COM', bio: 'Loves IELTS.' };

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

// ═════════════════════════════════════════════════════════════════════════════
// 4. uploadAvatarUseCase
// ═════════════════════════════════════════════════════════════════════════════
describe('uploadAvatarUseCase', () => {
    const VALID_FILE = { mimetype: 'image/jpeg', size: 1024 * 1024 };
    const AVATAR_URL = 'https://cdn.example.com/avatars/user-1.jpg';

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

// ═════════════════════════════════════════════════════════════════════════════
// 5. uploadCoverUseCase
// ═════════════════════════════════════════════════════════════════════════════
describe('uploadCoverUseCase', () => {
    const VALID_FILE = { mimetype: 'image/webp', size: 2 * 1024 * 1024 };
    const COVER_URL  = 'https://cdn.example.com/covers/user-1.webp';

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

// ═════════════════════════════════════════════════════════════════════════════
// 6. uploadFileUseCase
// ═════════════════════════════════════════════════════════════════════════════
describe('uploadFileUseCase', () => {
    const VALID_FILE = {
        originalName: 'essay.pdf',
        storedName:   'uuid-essay.pdf',
        mimetype:     'application/pdf',
        size:         500 * 1024,
        url:          'https://cdn.example.com/files/uuid-essay.pdf',
    };

    beforeEach(() => jest.clearAllMocks());

    describe('validateFileInput', () => {
        const ALLOWED = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'text/plain',
        ];

        it('accepts all allowed MIME types', () => {
            ALLOWED.forEach((mimetype) => {
                expect(() => validateFileInput({ originalName: 'f.bin', mimetype, size: 1024 })).not.toThrow();
            });
        });

        it('throws UserInvalidFileTypeError for a disallowed MIME type', () => {
            expect(() => validateFileInput({ originalName: 'f.exe', mimetype: 'application/x-msdownload', size: 100 }))
                .toThrow(UserInvalidFileTypeError);
        });

        it('throws UserFileTooLargeError when file exceeds 10 MB', () => {
            expect(() => validateFileInput({ originalName: 'big.pdf', mimetype: 'application/pdf', size: 10 * 1024 * 1024 + 1 }))
                .toThrow(UserFileTooLargeError);
        });

        it('does NOT throw when file is exactly 10 MB', () => {
            expect(() => validateFileInput({ originalName: 'exact.pdf', mimetype: 'application/pdf', size: 10 * 1024 * 1024 }))
                .not.toThrow();
        });
    });

    it('calls repo.addAttachment with userId and correct attachment shape', async () => {
        userRepo.addAttachment.mockResolvedValue({ _id: 'attach-1', ...VALID_FILE });

        await uploadFileUseCase('user-1', VALID_FILE);

        expect(userRepo.addAttachment).toHaveBeenCalledWith('user-1', {
            originalName: 'essay.pdf',
            storedName:   'uuid-essay.pdf',
            mimeType:     'application/pdf',
            size:         500 * 1024,
            url:          'https://cdn.example.com/files/uuid-essay.pdf',
        });
    });

    it('maps mimetype → mimeType in the attachment object', async () => {
        userRepo.addAttachment.mockResolvedValue({});
        await uploadFileUseCase('user-1', VALID_FILE);
        const attachArg = userRepo.addAttachment.mock.calls[0][1];
        expect(attachArg).toHaveProperty('mimeType', 'application/pdf');
        expect(attachArg).not.toHaveProperty('mimetype');
    });

    it('returns the repo result', async () => {
        const saved = { _id: 'attach-1', originalName: 'essay.pdf' };
        userRepo.addAttachment.mockResolvedValue(saved);
        const result = await uploadFileUseCase('user-1', VALID_FILE);
        expect(result).toBe(saved);
    });

    it('does NOT call repo when MIME type is invalid', async () => {
        await expect(
            uploadFileUseCase('user-1', { ...VALID_FILE, mimetype: 'application/x-rar-compressed' })
        ).rejects.toThrow(UserInvalidFileTypeError);
        expect(userRepo.addAttachment).not.toHaveBeenCalled();
    });

    it('does NOT call repo when file is too large', async () => {
        await expect(
            uploadFileUseCase('user-1', { ...VALID_FILE, size: 99 * 1024 * 1024 })
        ).rejects.toThrow(UserFileTooLargeError);
        expect(userRepo.addAttachment).not.toHaveBeenCalled();
    });

    it('validates that originalName is required', () => {
        validateFileInput({ originalName: 'report.pdf', mimetype: 'application/pdf', size: 100 });
        expect(validateRequired).toHaveBeenCalledWith('report.pdf', 'file name');
    });
});