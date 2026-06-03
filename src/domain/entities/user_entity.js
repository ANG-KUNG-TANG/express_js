import { UniqueId }   from "../base/id_generator.js";
import { UserRole }   from "../base/user_enums.js";
import {
    UserNameRequiredError,
    UserValidationError
} from "../../core/errors/user.errors.js";

// Import your newly cleaned up, decoupled validator helpers!
import { 
    validateStringLength, 
    validateEmail, 
    validatePasswordStrength, 
    validateRole 
} from '../validators/user_validator.js'; 

import {
    UserAlreadyAdminError,
    UserAlreadyVerifiedError,
    UserAlreadyActiveError,
    UserAlreadyInactiveError,
} from "../../core/errors/user.errors.js";

export class User {

    // ── True private fields ──────────────────────────────────────────────────
    #id;
    #name;
    #email;
    #password;
    #role;
    #provider;
    #providerId;
    #avatarUrl;
    #coverUrl;
    #bio;
    #targetBand;
    #examDate;
    #attachments;
    #createdAt;
    #updatedAt;
    #assignedTeacher;
    #isVerified;
    #isActive;

    // ── Private constructor ──────────────────────────────────────────────────
    constructor(props, _guard) {
        if (_guard !== _GUARD_TOKEN) {
            throw new Error(
                'Use User.create(), User.createOAuth(), or User.reconstitute() — ' +
                'do not call new User() directly.'
            );
        }
        this.#id              = props.id;
        this.#name            = props.name;
        this.#email           = props.email;
        this.#password        = props.password        ?? null;
        this.#role            = props.role;
        this.#provider        = props.provider;
        this.#providerId      = props.providerId      ?? null;
        this.#avatarUrl       = props.avatarUrl       ?? null;
        this.#coverUrl        = props.coverUrl        ?? null;
        this.#bio             = props.bio             ?? '';
        this.#targetBand      = props.targetBand      ?? null;
        this.#examDate        = props.examDate        ?? null;
        this.#attachments     = props.attachments     ?? [];
        this.#createdAt       = props.createdAt;
        this.#updatedAt       = props.updatedAt;
        this.#assignedTeacher = props.assignedTeacher ?? null;
        this.#isVerified      = props.isVerified      ?? false;
        this.#isActive        = props.isActive        ?? true;
    }

    // =========================================================================
    // Static Factory Methods
    // =========================================================================

    /**
     * User.create() — Brand-new local registration.
     */
    static create({ name, email, password, role = UserRole.USER, bio, targetBand, examDate }) {
        // Presence assertions inside the factory
        if (!name) throw new UserNameRequiredError();
        if (!email) throw new UserValidationError('Email is required');

        // External structural format validation calls
        const validatedName = validateStringLength(name, 'name', 3, 100);
        const validatedEmail = validateEmail(email);
        validatePasswordStrength(password, 8); // Ensures pre-hashed meets length limits
        const validatedRole = validateRole(role);

        return new User({
            id:         new UniqueId().generator(),
            name:       validatedName,
            email:      validatedEmail,
            password,
            role:       validatedRole,
            provider:   'local',
            bio:        bio ?? '',
            targetBand,
            examDate,
            createdAt:  new Date(),
            updatedAt:  new Date(),
            isVerified: false,
            isActive:   true,
        }, _GUARD_TOKEN);
    }

    /**
     * User.createOAuth() — First-time external provider sign-in.
     */
    static createOAuth({ name, email, provider, providerId, avatarUrl, role = UserRole.USER }) {
        if (!name) throw new UserNameRequiredError();
        if (!email) throw new UserValidationError('Email is required');

        const validatedName = validateStringLength(name, 'name', 3, 100);
        const validatedEmail = validateEmail(email);
        const validatedRole = validateRole(role);

        if (!provider || provider === 'local') {
            throw new Error('createOAuth requires a non-local provider');
        }

        return new User({
            id:         new UniqueId().generator(),
            name:       validatedName,
            email:      validatedEmail,
            password:   null,
            role:       validatedRole,
            provider,
            providerId,
            avatarUrl,
            createdAt:  new Date(),
            updatedAt:  new Date(),
            isVerified: true, 
            isActive:   true,
        }, _GUARD_TOKEN);
    }

    /**
     * User.reconstitute() — Re-hydrates an existing document from persistence.
     */
    static reconstitute(raw) {
        return new User({
            id:              raw.id              ?? raw._id?.toString(),
            name:            raw.name,
            email:           raw.email,
            password:        raw.password        ?? null,
            role:            raw.role            ?? UserRole.USER,
            provider:        raw.provider        ?? 'local',
            providerId:      raw.providerId      ?? null,
            avatarUrl:       raw.avatarUrl       ?? null,
            coverUrl:        raw.coverUrl        ?? null,
            bio:             raw.bio             ?? '',
            targetBand:      raw.targetBand      ?? null,
            examDate:        raw.examDate        ?? null,
            attachments:     raw.attachments     ?? [],
            createdAt:       raw.createdAt       ?? new Date(),
            updatedAt:       raw.updatedAt       ?? new Date(),
            assignedTeacher: raw.assignedTeacher ?? null,
            isVerified:      raw.isVerified      ?? false,
            isActive:        raw.isActive        ?? true,
        }, _GUARD_TOKEN);
    }

    // =========================================================================
    // Domain Methods — state transitions and behavior updates
    // =========================================================================

    verify() {
        if (this.#isVerified) throw new UserAlreadyVerifiedError();
        this.#isVerified = true;
        this.#updatedAt  = new Date();
    }

    deactivate() {
        if (!this.#isActive) throw new UserAlreadyInactiveError();
        this.#isActive  = false;
        this.#updatedAt = new Date();
    }

    reactivate() {
        if (this.#isActive) throw new UserAlreadyActiveError();
        this.#isActive  = true;
        this.#updatedAt = new Date();
    }

    promoteToAdmin() {
        if (this.#role === UserRole.ADMIN) throw new UserAlreadyAdminError();
        this.#role      = UserRole.ADMIN;
        this.#updatedAt = new Date();
    }

    demoteToUser() {
        this.#role            = UserRole.USER;
        this.#assignedTeacher = null;
        this.#updatedAt       = new Date();
    }

    updateProfile({ name, bio, targetBand, examDate }) {
        if (name !== undefined) { 
            if (!name) throw new UserNameRequiredError();
            this.#name = validateStringLength(name, 'name', 3, 100); 
        }
        if (bio        !== undefined) this.#bio        = bio;
        if (targetBand !== undefined) this.#targetBand = targetBand;
        if (examDate   !== undefined) this.#examDate   = examDate;
        this.#updatedAt = new Date();
    }

    updateEmail(email) {
        if (!email) throw new UserValidationError('Email is required');
        this.#email     = validateEmail(email);
        this.#updatedAt = new Date();
    }

    changePassword(hashedPassword) {
        if (!hashedPassword) throw new UserValidationError('Password hash is required');
        validatePasswordStrength(hashedPassword, 8);
        this.#password  = hashedPassword;
        this.#updatedAt = new Date();
    }

    setAvatarUrl(url) {
        this.#avatarUrl = url ?? null;
        this.#updatedAt = new Date();
    }

    setCoverUrl(url) {
        this.#coverUrl  = url ?? null;
        this.#updatedAt = new Date();
    }

    assignTeacher(teacherId) {
        this.#assignedTeacher = teacherId ?? null;
        this.#updatedAt       = new Date();
    }

    // =========================================================================
    // Public Getters Surface
    // =========================================================================

    get id()              { return this.#id; }
    get name()            { return this.#name; }
    get email()           { return this.#email; }
    get password()        { return this.#password; }
    get role()            { return this.#role; }
    get provider()        { return this.#provider; }
    get providerId()      { return this.#providerId; }
    get avatarUrl()       { return this.#avatarUrl; }
    get coverUrl()        { return this.#coverUrl; }
    get bio()             { return this.#bio; }
    get targetBand()      { return this.#targetBand; }
    get examDate()        { return this.#examDate; }
    get attachments()     { return this.#attachments; }
    get createdAt()       { return this.#createdAt; }
    get updatedAt()       { return this.#updatedAt; }
    get assignedTeacher() { return this.#assignedTeacher; }
    get isVerified()      { return this.#isVerified; }
    get isActive()        { return this.#isActive; }
}

const _GUARD_TOKEN = Symbol('User.constructor.guard');