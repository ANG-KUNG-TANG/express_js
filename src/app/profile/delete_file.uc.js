import * as userRepo from '../../infrastructure/repositories/user_repo.js';
import { validateRequired } from '../validators/user_validator.js';
import { UserFileNotFoundError } from '../../core/errors/user.errors.js';

export const validateDeleteFileInput = ({ userId, fileId }) => {
    validateRequired(userId, 'userId');
    validateRequired(fileId, 'fileId');
};

export const deleteFileUseCase = async (userId, fileId) => {
    validateDeleteFileInput({ userId, fileId });

    const attachments = await userRepo.getAttachments(userId);
    const exists = attachments.some(a => a._id.toString() === fileId);
    if (!exists) throw new UserFileNotFoundError(fileId);

    return await userRepo.removeAttachment(userId, fileId);
};