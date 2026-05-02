// src/tests/application/profile/delete_file.uc.test.js

import { jest } from '@jest/globals';

// ═══════════════════════════════════════════════════════
// Mocks (must come before the dynamic imports)
// ═══════════════════════════════════════════════════════
jest.unstable_mockModule('../../../infrastructure/repositories/user_repo.js', () => ({
    getAttachments:   jest.fn(),
    removeAttachment: jest.fn(),
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
    return { UserFileNotFoundError: make('UserFileNotFoundError') };
});

// ─── Lazy imports ──────────────────────────────────────
const userRepo = await import('../../../infrastructure/repositories/user_repo.js');
const { validateRequired } = await import('../../../app/validators/user_validator.js');
const { UserFileNotFoundError } = await import('../../../core/errors/user.errors.js');
const { deleteFileUseCase, validateDeleteFileInput } = await import('../../../app/profile/delete_file.uc.js');

// ─── Helper ─────────────────────────────────────────────
const makeAttachment = (id = 'file-1', overrides = {}) => ({
    _id:          { toString: () => id },
    originalName: 'report.pdf',
    mimeType:     'application/pdf',
    size:         1024,
    url:          `https://cdn.example.com/${id}`,
    ...overrides,
});

// ═══════════════════════════════════════════════════════
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