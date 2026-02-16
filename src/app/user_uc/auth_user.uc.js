import { findUserByEmail, sanitizeUser } from '../../infrastructure/repositories/user_repo.js';
import { InvalidCredentialsError } from '../../core/errors/user.errors.js';
import { verifyPassword } from '../../core/utils/hash_password.js';
import { validateRequired, validateEmail } from '../validators/user_validator.js';

const validateAuthInput = ({ email, password }) => {
    validateRequired(email, 'email');
    validateEmail(email);
    validateRequired(password, 'password');
};

export const authenticateUserUseCase = async ({ email, password }) => {
    validateAuthInput({ email, password });

    // Load full user including hashed password
    const user = await findUserByEmail(email.toLowerCase());

    // verifyPassword uses timingSafeEqual — safe against timing attacks
    if (!verifyPassword(password, user._password)) {
        throw new InvalidCredentialsError();
    }

    // Return sanitized user — no password field exposed
    return sanitizeUser(user);
};