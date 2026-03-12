import * as userRepo from '../../infrastructure/repositories/user_repo.js';
import { validateRequired } from '../validators/user_validator.js';

export const validateGetFilesInput = ({ userId }) => {
    validateRequired(userId, 'userId');
};

export const getFilesUseCase = async (userId) => {
    validateGetFilesInput({ userId });

    return await userRepo.getAttachments(userId);
};