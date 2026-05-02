// src/tests/application/profile/upload_file.uc.test.js

import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../infrastructure/repositories/user_repo.js', () => ({
    addAttachment: jest.fn(),
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
        UserInvalidFileTypeError: make('UserInvalidFileTypeError'),
        UserFileTooLargeError:    make('UserFileTooLargeError'),
    };
});

const userRepo = await import('../../../infrastructure/repositories/user_repo.js');
const { validateRequired } = await import('../../../app/validators/user_validator.js');
const { UserInvalidFileTypeError, UserFileTooLargeError } = await import('../../../core/errors/user.errors.js');
const { uploadFileUseCase, validateFileInput } = await import('../../../app/profile/upload_file.uc.js');

const VALID_FILE = {
    originalName: 'essay.pdf',
    storedName:   'uuid-essay.pdf',
    mimetype:     'application/pdf',
    size:         500 * 1024,
    url:          'https://cdn.example.com/files/uuid-essay.pdf',
};

describe('uploadFileUseCase', () => {
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