import * as userRepo from '../../infrastructure/repositories/user_repo.js';
import { validateRequired } from '../validators/user_validator.js';
import {
    UserInvalidFileTypeError,
    UserFileTooLargeError,
} from '../../core/errors/user.errors.js';

const ALLOWED_MIME_TYPES = [
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
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_SIZE_MB    = 10;

export const validateFileInput = ({ originalName, mimetype, size }) => {
    validateRequired(originalName, 'file name');
    validateRequired(mimetype, 'file mimetype');
    if (!ALLOWED_MIME_TYPES.includes(mimetype)) throw new UserInvalidFileTypeError(mimetype);
    if (size > MAX_SIZE_BYTES)                   throw new UserFileTooLargeError(originalName, MAX_SIZE_MB);
};

export const uploadFileUseCase = async (userId, { originalName, storedName, mimetype, size, url }) => {
    validateFileInput({ originalName, mimetype, size });

    const attachment = { originalName, storedName, mimeType: mimetype, size, url };

    return await userRepo.addAttachment(userId, attachment);
};