import { UniqueId }   from "../base/id_generator.js";
import { UserRole }   from "../base/user_enums.js";
import {
    UserNameRequiredError,
    UserNameTooShortError,
    UserNameTooLongError,
    UserInvalidEmailError,
    UserPasswordTooWeakError,
    UserInvalidRoleError,
    UserAlreadyAdminError,
    UserAlreadyVerifiedError,
    UserAlreadyActiveError,
    UserAlreadyInactiveError,
} from "../../core/errors/user.errors.js";

// ---------------------------------------------------------------------------
// User — Domain Entity
//
// Construction is intentionally restricted to the three static factory
// methods below.  The plain constructor is kept private (# fields enforce
// this at the JS engine level) so callers are forced to be explicit about
// *why* a User is being created:
//
//   User.create(props)          — brand-new registration / sign-up
//   User.createOAuth(props)     — first-time OAuth login (no password)
//   User.reconstitute(raw)      — re-hydrate from a persistence document
//
// This makes the call-site self-documenting and lets each factory apply
// exactly the right defaults and validations for its context.
// ---------------------------------------------------------------------------

export class User {

    // ── True private fields (JS # syntax — enforced by the engine) ──────────
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

    // ── Private constructor — not callable from outside this class ───────────
    // Receives a fully-validated, fully-defaulted props object so no
    // validation is duplicated between factory methods.
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
     * User.create({ name, email, password, role?, bio?, targetBand?, examDate? })
     *
     * For a new local registration.  Generates a fresh ID, stamps timestamps,
     * and applies all field validations.  Password is required here.
     */
    static create({ name, email, password, role = UserRole.USER, bio, targetBand, examDate }) {
        _validateName(name);
        _validateEmail(email);
        _validatePasswordRequired(password);   // password is mandatory for local
        _validateRole(role);

        return new User({
            id:         new UniqueId().generator(),
            name:       name.trim(),
            email:      email.toLowerCase().trim(),
            password,
            role,
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
     * User.createOAuth({ name, email, provider, providerId, avatarUrl?, role? })
     *
     * For a first-time OAuth sign-in (Google, GitHub …).
     * Password is explicitly null — the OAuth provider is the credential.
     * The account is considered pre-verified because the provider already
     * confirmed the email address.
     */
    static createOAuth({ name, email, provider, providerId, avatarUrl, role = UserRole.USER }) {
        _validateName(name);
        _validateEmail(email);
        _validateRole(role);

        if (!provider || provider === 'local') {
            throw new Error('createOAuth requires a non-local provider');
        }

        return new User({
            id:         new UniqueId().generator(),
            name:       name.trim(),
            email:      email.toLowerCase().trim(),
            password:   null,
            role,
            provider,
            providerId,
            avatarUrl,
            createdAt:  new Date(),
            updatedAt:  new Date(),
            isVerified: true,   // OAuth provider already verified the email
            isActive:   true,
        }, _GUARD_TOKEN);
    }

    /**
     * User.reconstitute(raw)
     *
     * Re-hydrates a User from a raw persistence document (plain JS object
     * coming from toDomain / the mapper).  Skips all "creation" validations
     * because the data was already validated when it was first persisted.
     * This is the only factory the repository layer should call.
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
    // Domain Methods — behaviour that belongs on the entity
    // =========================================================================

    /**
     * Mark the user's email address as verified.
     * Throws if already verified (idempotency guard).
     */
    verify() {
        if (this.#isVerified) throw new UserAlreadyVerifiedError();
        this.#isVerified = true;
        this.#updatedAt  = new Date();
    }

    /**
     * Deactivate the account (soft-disable).
     * The user can no longer log in but all data is preserved.
     */
    deactivate() {
        if (!this.#isActive) throw new UserAlreadyInactiveError();
        this.#isActive  = false;
        this.#updatedAt = new Date();
    }

    /**
     * Re-activate a previously deactivated account.
     */
    reactivate() {
        if (this.#isActive) throw new UserAlreadyActiveError();
        this.#isActive  = true;
        this.#updatedAt = new Date();
    }

    /**
     * Promote the user to ADMIN role.
     * Throws if already an admin.
     */
    promoteToAdmin() {
        if (this.#role === UserRole.ADMIN) throw new UserAlreadyAdminError();
        this.#role      = UserRole.ADMIN;
        this.#updatedAt = new Date();
    }

    /**
     * Demote back to the base USER role and clear the teacher assignment.
     */
    demoteToUser() {
        this.#role            = UserRole.USER;
        this.#assignedTeacher = null;
        this.#updatedAt       = new Date();
    }

    /**
     * Update profile fields.
     * Only the supplied fields are changed; omitted fields are left untouched.
     */
    updateProfile({ name, bio, targetBand, examDate }) {
        if (name       !== undefined) { _validateName(name); this.#name = name.trim(); }
        if (bio        !== undefined) this.#bio        = bio;
        if (targetBand !== undefined) this.#targetBand = targetBand;
        if (examDate   !== undefined) this.#examDate   = examDate;
        this.#updatedAt = new Date();
    }

    /**
     * Change the stored (already-hashed) password.
     * The caller (use case) is responsible for hashing before passing it in.
     */
    changePassword(hashedPassword) {
        _validatePasswordRequired(hashedPassword);
        this.#password  = hashedPassword;
        this.#updatedAt = new Date();
    }

    /**
     * Update avatar / cover photo URLs (set by the upload service).
     */
    setAvatarUrl(url) {
        this.#avatarUrl = url ?? null;
        this.#updatedAt = new Date();
    }

    setCoverUrl(url) {
        this.#coverUrl  = url ?? null;
        this.#updatedAt = new Date();
    }

    /**
     * Link this student to a teacher.
     */
    assignTeacher(teacherId) {
        this.#assignedTeacher = teacherId ?? null;
        this.#updatedAt       = new Date();
    }

    // =========================================================================
    // Getters — read-only public surface
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

// =============================================================================
// Module-private guard token
//
// A unique Symbol known only inside this module.  It is passed as the second
// argument to `new User()` and checked inside the constructor.  Because the
// Symbol is not exported, nothing outside this file can forge it — effectively
// making the constructor private without a bundler or TypeScript.
// =============================================================================
const _GUARD_TOKEN = Symbol('User.constructor.guard');

// =============================================================================
// Module-private validators
//
// Plain functions (not methods) so they can be called from the static factory
// methods before a User instance even exists.
// =============================================================================

function _validateName(name) {
    if (!name)                     throw new UserNameRequiredError();
    if (name.trim().length < 3)    throw new UserNameTooShortError(3);
    if (name.trim().length > 100)  throw new UserNameTooLongError(100);
}

function _validateEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !pattern.test(email)) throw new UserInvalidEmailError(email);
}

function _validatePasswordRequired(password) {
    if (!password || password.length < 8) throw new UserPasswordTooWeakError(8);
}

function _validateRole(role) {
    if (!Object.values(UserRole).includes(role)) throw new UserInvalidRoleError(role);
}