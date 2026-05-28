import { UniqueId } from "../base/id_generator.js";
import { UserRole }  from "../base/user_enums.js";
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

export class User {
    // ── True private fields (JS native encapsulation) ───────────────────────
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

    constructor(props) {
        this.#initialize(props);
    }

    // ── Initialization ───────────────────────────────────────────────────────

    #initialize({
        id,
        name,
        email,
        password,
        role            = UserRole.USER,
        provider        = 'local',
        providerId      = null,
        avatarUrl       = null,
        coverUrl        = null,
        bio             = '',
        targetBand      = null,
        examDate        = null,
        attachments     = [],
        createdAt       = new Date(),
        updatedAt       = new Date(),
        assignedTeacher = null,
        isVerified      = false,
        isActive        = true,
    }) {
        this.#validateName(name);
        this.#validateEmail(email);
        this.#validatePassword(password);
        this.#validateRole(role);

        this.#id              = id || new UniqueId().generator();
        this.#name            = name;
        this.#email           = email;
        this.#password        = password;
        this.#role            = role;
        this.#provider        = provider;
        this.#providerId      = providerId;
        this.#avatarUrl       = avatarUrl;
        this.#coverUrl        = coverUrl;
        this.#bio             = bio;
        this.#targetBand      = targetBand;
        this.#examDate        = examDate;
        this.#attachments     = attachments;
        this.#createdAt       = createdAt;
        this.#updatedAt       = updatedAt;
        this.#assignedTeacher = assignedTeacher ?? null;
        this.#isVerified      = isVerified;
        this.#isActive        = isActive;
    }

    // ── Private validators ───────────────────────────────────────────────────

    #validateName(name) {
        if (!name)                     throw new UserNameRequiredError();
        if (name.trim().length < 3)    throw new UserNameTooShortError(3);
        if (name.trim().length > 100)  throw new UserNameTooLongError(100);
    }

    #validateEmail(email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailPattern.test(email)) throw new UserInvalidEmailError(email);
    }

    #validatePassword(password) {
        if (password === null || password === undefined) return;
        if (!password || password.length < 8) throw new UserPasswordTooWeakError(8);
    }

    #validateRole(role) {
        if (!Object.values(UserRole).includes(role)) throw new UserInvalidRoleError(role);
    }

    #touch() {
        this.#updatedAt = new Date();
    }

    // ── Domain methods ───────────────────────────────────────────────────────

    promoteToAdmin() {
        if (this.#role === UserRole.ADMIN) throw new UserAlreadyAdminError();
        this.#role = UserRole.ADMIN;
        this.#touch();
    }

    verify() {
        if (this.#isVerified) throw new UserAlreadyVerifiedError();
        this.#isVerified = true;
        this.#touch();
    }

    deactivate() {
        if (!this.#isActive) throw new UserAlreadyInactiveError();
        this.#isActive = false;
        this.#touch();
    }

    activate() {
        if (this.#isActive) throw new UserAlreadyActiveError();
        this.#isActive = true;
        this.#touch();
    }

    // ── Profile setters (validated) ──────────────────────────────────────────

    updateName(name) {
        this.#validateName(name);
        this.#name = name;
        this.#touch();
    }

    updateEmail(email) {
        this.#validateEmail(email);
        this.#email = email.toLowerCase();
        this.#touch();
    }

    updatePassword(password) {
        this.#validatePassword(password);
        this.#password = password;
        this.#touch();
    }

    updateRole(role) {
        this.#validateRole(role);
        this.#role = role;
        this.#touch();
    }

    updateProfile({ bio, targetBand, examDate, avatarUrl, coverUrl } = {}) {
        if (bio         !== undefined) this.#bio        = bio;
        if (targetBand  !== undefined) this.#targetBand = targetBand;
        if (examDate    !== undefined) this.#examDate   = examDate;
        if (avatarUrl   !== undefined) this.#avatarUrl  = avatarUrl;
        if (coverUrl    !== undefined) this.#coverUrl   = coverUrl;
        this.#touch();
    }

    assignTeacher(teacherId) {
        this.#assignedTeacher = teacherId ?? null;
        this.#touch();
    }

    addAttachment(attachment) {
        this.#attachments = [...this.#attachments, attachment];
        this.#touch();
    }

    removeAttachment(fileId) {
        this.#attachments = this.#attachments.filter(
            (a) => String(a._id) !== String(fileId)
        );
        this.#touch();
    }

    // ── Getters ──────────────────────────────────────────────────────────────

    get id()              { return this.#id; }
    get name()            { return this.#name; }
    get email()           { return this.#email; }
    get role()            { return this.#role; }
    get password()        { return this.#password; }
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