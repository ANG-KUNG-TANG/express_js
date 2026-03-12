import * as userRepo from '../../infrastructure/repositories/user_repo.js';
import { validateRequired } from '../validators/user_validator.js';
import {
    UserInvalidAvatarTypeError,
    UserAvatarTooLargeError,
} from '../../core/errors/user.errors.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES      = 5 * 1024 * 1024;
const MAX_SIZE_MB         = 5;

export const validateAvatarInput = ({ mimetype, size }) => {
    validateRequired(mimetype, 'file mimetype');
    if (!ALLOWED_MIME_TYPES.includes(mimetype)) throw new UserInvalidAvatarTypeError(mimetype);
    if (size > MAX_SIZE_BYTES)                   throw new UserAvatarTooLargeError(MAX_SIZE_MB);
};

export const uploadAvatarUseCase = async (userId, { avatarUrl, mimetype, size }) => {
    validateAvatarInput({ mimetype, size });
    return await userRepo.updateAvatarUrl(userId, avatarUrl);
};