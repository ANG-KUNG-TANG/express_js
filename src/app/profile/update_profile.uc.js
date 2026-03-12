import * as userRepo from '../../infrastructure/repositories/user_repo.js';
import {
    validateRequired,
    validateStringLength,
    validateEmail,
} from '../validators/user_validator.js';
import {
    UserBioTooLongError,
} from '../../core/errors/user.errors.js';

const NAME_MIN = 3;
const NAME_MAX = 100;
const BIO_MAX  = 300;

export const validateUpdateProfileInput = ({ name, email, bio }) => {
    validateRequired(name, 'name');
    validateStringLength(name, 'name', NAME_MIN, NAME_MAX);
    validateRequired(email, 'email');
    validateEmail(email);
    if (bio && bio.trim().length > BIO_MAX) throw new UserBioTooLongError(BIO_MAX);
};

export const updateProfileInfoUseCase = async (userId, { name, email, bio, targetBand, examDate }) => {
    validateUpdateProfileInput({ name, email, bio });

    return await userRepo.updateProfileInfo(userId, {
        name:       name.trim(),
        email:      email.toLowerCase(),
        bio:        bio?.trim() ?? '',
        targetBand: targetBand ?? null,
        examDate:   examDate   ?? null,
    });
};