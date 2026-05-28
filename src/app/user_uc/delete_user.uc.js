import * as userRepo from '../../infrastructure/repositories/user_repo.js';
import { validateRequired } from '../../domain/validators/user_validator.js';


export const deleteUserUc = async (id) => {
    // 1. Guard against empty inputs at the application boundary
    validateRequired(id, 'id');

    // 2. Execute deletion directly. If the ID is missing or invalid, 
    //    the repository will natively throw UserNotFoundError / UserValidationError.
    await userRepo.deleteUser(id);

    // 3. Return a clean confirmation DTO
    return { 
        deleted: true, 
        id 
    };
};