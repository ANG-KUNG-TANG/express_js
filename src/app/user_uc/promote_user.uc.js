import * as userRepo from '../../infrastructure/repositories/user_repo.js';
import { validateRequired } from '../../domain/validators/user_validator.js';

/**
 * promoteUserToAdminUseCase — Safely elevates a user's privileges to ADMIN.
 * Relies entirely on the repository's transactional mutation wrapper.
 */
export const promoteUserToAdminUseCase = async (id) => {
    // 1. Validate incoming input at the application boundary
    validateRequired(id, 'id');

    // 2. Dispatch directly to the repository wrapper.
    //    This automatically handles loading, entity business rule checks,
    //    and database updates cleanly in a single operation.
    return await userRepo.promoteToAdmin(id);
};