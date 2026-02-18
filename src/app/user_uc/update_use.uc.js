import { findUserById, updateUser } from '../../infrastructure/repositories/user_repo.js';
import { UserValidationError } from '../../core/errors/user.errors.js';
import { hashPassword } from '../validators/password_hash.js';  
import {
    validateRequired,
    validateStringLength,
    validateEmail,
    validatePassword,
    validateRole,
} from '../validators/user_validator.js';

const NAME_MIN = 3;
const NAME_MAX = 100;
const PASSWORD_MIN = 8;
const ALLOWED_FIELDS = ['name', 'email', 'password', 'role'];

const sanitizeUpdates = (updates) =>
    Object.fromEntries(Object.entries(updates).filter(([key]) => ALLOWED_FIELDS.includes(key)));

const validateUpdateInput = (updates) => {
    if (Object.keys(updates).length === 0) throw new UserValidationError('No valid fields provided to update');
    if (updates.name !== undefined) {
        validateRequired(updates.name, 'name');
        validateStringLength(updates.name, 'name', NAME_MIN, NAME_MAX);
    }
    if (updates.email !== undefined) {
        validateRequired(updates.email, 'email');
        validateEmail(updates.email);
    }
    if (updates.password !== undefined) validatePassword(updates.password, PASSWORD_MIN);
    if (updates.role !== undefined) validateRole(updates.role);
};

export const updateUserUseCase = async (id, updates) => {
    validateRequired(id, 'id');
    const sanitized = sanitizeUpdates(updates);
    validateUpdateInput(sanitized);

    const user = await findUserById(id);

    if (sanitized.name !== undefined) user._name = sanitized.name.trim();
    if (sanitized.email !== undefined) user._email = sanitized.email.toLowerCase();
    if (sanitized.password !== undefined) user._password = hashPassword(sanitized.password);
    if (sanitized.role !== undefined) user._role = sanitized.role;
    user._updatedAt = new Date();

    return await updateUser(id, user);
};