import * as userRepo from '../../infrastructure/repositories/user_repo';
import { validateRequired } from '../validators/user_validator';


export const deleteUserUc = async (id) =>{
    validateRequired(id, 'id');
    await userRepo.findUserById(id);
    await userRepo.deleteUser(id);
    return {deleted: true, id};
}