import crypto                                     from 'crypto';
import * as userRepo                              from '../../infrastructure/repositories/user_repo.js';
import { passwordResetTokenRepo as tokenRepo }    from '../../infrastructure/repositories/password_reset_token_repo.js';
import { PasswordResetToken }                     from '../../domain/entities/password_reset_token_entity.js';
import { emailService }                           from '../../core/services/email.service.js';
import { User }                                   from '../../domain/entities/user_entity.js';
import { hashPassword }                           from '../../domain/validators/password_hash.js';
import { validatePasswordStrength }               from '../../domain/validators/user_validator.js';
import { ConflictError }                          from '../../core/errors/base.errors.js';
import { EMAIL_VERIFY_TTL_MS }                    from '../../domain/base/token_ttl.js';
import { UniqueId }                               from '../../domain/base/id_generator.js';

const PASSWORD_MIN = 8;

export const createUserUsecase = async ({ name, email, password, role, provider }) => {
    const normalizedEmail = email?.toLowerCase().trim();
    const isLocal = !provider || provider === 'local';

    // 1. Check for existing account — swallow not-found, rethrow anything else
    let existing = null;
    try {
        existing = await userRepo.findByEmail(normalizedEmail);
    } catch (err) {
        if (err.name !== 'UserEmailNotFoundError') throw err;
    }
    if (existing) {
        throw new ConflictError('An account with this email already exists.');
    }

    // 2. Handle Password Validation and Crypto Hashing safely in the Use Case
    let hashedPassword = null;
    if (isLocal) {
        // Enforce plain text strength limits BEFORE hashing it
        validatePasswordStrength(password, PASSWORD_MIN);
        hashedPassword = await hashPassword(password);
    }

    // 3. Delegate ALL validation and entity orchestration to the proper Static Factory
    let userEntity;
    if (isLocal) {
        userEntity = User.create({
            name,
            email: normalizedEmail,
            password: hashedPassword, // Pass pre-hashed string
            role
        });
    } else {
        userEntity = User.createOAuth({
            name,
            email: normalizedEmail,
            provider,
            providerId: null, // Pass incoming third-party ID if available
            role
        });
    }

    // 4. Save entity to database via your repository bridge
    const created = await userRepo.createUser(userEntity);

    // ── Email verification token ─────────────────────────────────────────────
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);

    // Ensure your Token entity uses its correct constructor pattern or factory
    const tokenEntity = PasswordResetToken.reconstitute ? 
        PasswordResetToken.reconstitute({
            id:        new UniqueId().generator(),
            userId:    created.id,
            tokenHash,
            expiresAt,
            used:      false,
        }) : 
        new PasswordResetToken({
            id:        new UniqueId().generator(),
            userId:    created.id,
            tokenHash,
            expiresAt,
            used:      false,
        });

    await tokenRepo.create(tokenEntity);

    // ── Fire-and-forget verification email ───────────────────────────────────
    emailService.sendVerificationEmail({
        toEmail:  normalizedEmail,
        userName: created.name,
        rawToken,
    }).catch((err) => {
        console.error('[createUserUsecase] failed to send verification email:', err.message);
    });

    return created;
};