// src/tests/application/profile/get_file.uc.test.js

import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../infrastructure/repositories/user_repo.js', () => ({
    getAttachments: jest.fn(),
}));

jest.unstable_mockModule('../../../app/validators/user_validator.js', () => ({
    validateRequired: jest.fn(),
}));

const userRepo = await import('../../../infrastructure/repositories/user_repo.js');
const { validateRequired } = await import('../../../app/validators/user_validator.js');
const { getFilesUseCase, validateGetFilesInput } = await import('../../../app/profile/get_file.uc.js');

const makeAttachment = (id = 'file-1', overrides = {}) => ({
    _id:          { toString: () => id },
    originalName: 'report.pdf',
    mimeType:     'application/pdf',
    size:         1024,
    url:          `https://cdn.example.com/${id}`,
    ...overrides,
});

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