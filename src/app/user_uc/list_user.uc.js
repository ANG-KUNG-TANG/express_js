import * as userRepo from '../../infrastructure/repositories/user_repo.js';


export const listAllUsersUseCase = async () => {
    return await userRepo.lisAllUsers();
};