import { findUserByEmail, sanitizeUser } from '../../infrastructure/repositories/user_repo.js';
import { InvalidCredentialsError } from '../../core/errors/user.errors.js';
import { verifyPassword } from '../validators/password_hash.js';  
import { validateRequired, validateEmail } from '../validators/user_validator.js';

const validateAuthInput = ({ email, password }) => {
    validateRequired(email, 'email');
    validateEmail(email);
    validateRequired(password, 'password');
};

export const authenticateUserUseCase = async ({ email, password }) => {
    validateAuthInput({ email, password });

    const user = await findUserByEmail(email.toLowerCase());

    if (!verifyPassword(password, user._password)) {
        throw new InvalidCredentialsError();
    }

    return sanitizeUser(user);
};