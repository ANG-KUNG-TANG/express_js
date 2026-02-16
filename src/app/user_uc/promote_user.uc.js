import { findUserById, promoteToAdmin } from '../../infrastructure/repositories/user_repo.js';
import { UserAlreadyAdminError } from '../../core/errors/user.errors.js';
import { UserRole } from '../../domain/base/user_enums.js';
import { validateRequired } from '../validators/user_validator.js';

export const promoteUserToAdminUseCase = async (id) => {
    validateRequired(id, 'id');

    // Load entity — promoteToAdmin() on the entity throws UserAlreadyAdminError if already admin
    const user = await findUserById(id);

    if (user._role === UserRole.ADMIN) throw new UserAlreadyAdminError();

    // entity method handles the role transition + updatedAt
    user.promoteToAdmin();

    return await promoteToAdmin(id);
};