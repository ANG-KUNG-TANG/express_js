import * as userRepo from '../../infrastructure/repositories/user_repo.js';
import { toResponseDTO } from '../../infrastructure/mapper/user.mapper.js';

/**
 * listAllUsersUseCase — Returns a paginated, DTO-mapped user list.
 * Accepts optional filter/pagination params forwarded from the controller.
 */
export const listAllUsersUseCase = async ({ q, role, isActive, from, to, page = 1, limit = 20 } = {}) => {
    const result = await userRepo.searchUsers({ q, role, isActive, from, to, page, limit });
    return {
        ...result,
        data: result.data.map(toResponseDTO),
    };
};