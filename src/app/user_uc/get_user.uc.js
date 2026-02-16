import * as userRepo from '../../infrastructure/repositories/user_repo';
import { validateRequired, validateEmail } from '../validators/user_validator';

export const getUseByIdUc = async (id) =>{
    validateRequired(id, 'id');
    return await userRepo.findUserById(id);
}

export const getUserByEamilUc =async (email) => {
    validateRequired(email, 'email');
    validateEmail(email);
    return await userRepo.findUserByEmail(email.toLoserCase());
}