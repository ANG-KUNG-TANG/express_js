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
} from "../../core/errors/user.errors.js";

export class User {
    constructor(props) {
        this._initialize(props);
    }

    _initialize({
        id,
        name,
        email,
        password,
        role        = UserRole.USER,
        provider    = 'local',          // FIX: was missing — OAuth users were silently dropping this
        providerId  = null,             // FIX: was missing — never stored after OAuth signup
        avatarUrl   = null,
        coverUrl    = null,
        bio         = '',
        targetBand  = null,
        examDate    = null,
        attachments = [],               // FIX: was destructured but never assigned to this._attachments
        createdAt   = new Date(),
        updatedAt   = new Date(),
        assignedTeacher = null,
    }) {
        this._validateName(name);
        this._validateEmail(email);
        this._validatePassword(password);
        this._validateRole(role);

        this._id             = id || new UniqueId().generator();
        this._name           = name;
        this._email          = email;
        this._password       = password;
        this._role           = role;
        this._provider       = provider;
        this._providerId     = providerId;
        this._avatarUrl      = avatarUrl;
        this._coverUrl       = coverUrl;
        this._bio            = bio;
        this._targetBand     = targetBand;
        this._examDate       = examDate;
        this._attachments    = attachments;  // FIX: was never assigned — getter returned undefined
        this._createdAt      = createdAt;
        this._updatedAt      = updatedAt;
        this._assignedTeacher = assignedTeacher ?? null;
    }

    _validateName(name) {
        if (!name)                       throw new UserNameRequiredError();
        if (name.trim().length < 3)      throw new UserNameTooShortError(3);
        if (name.trim().length > 100)    throw new UserNameTooLongError(100);
    }

    _validateEmail(email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailPattern.test(email)) throw new UserInvalidEmailError(email);
    }

    _validatePassword(password) {
        if (password === null || password === undefined) return;
        if (!password || password.length < 8) throw new UserPasswordTooWeakError(8);
    }

    _validateRole(role) {
        if (!Object.values(UserRole).includes(role)) throw new UserInvalidRoleError(role);
    }

    promoteToAdmin() {
        if (this._role === UserRole.ADMIN) throw new UserAlreadyAdminError();
        this._role = UserRole.ADMIN;
        this._updatedAt = new Date();
    }

    get id()              { return this._id; }
    get name()            { return this._name; }
    get email()           { return this._email; }
    get role()            { return this._role; }
    get password()        { return this._password; }
    get provider()        { return this._provider; }
    get providerId()      { return this._providerId; }
    get avatarUrl()       { return this._avatarUrl; }
    get coverUrl()        { return this._coverUrl; }
    get bio()             { return this._bio; }
    get targetBand()      { return this._targetBand; }
    get examDate()        { return this._examDate; }
    get attachments()     { return this._attachments; }
    get createdAt()       { return this._createdAt; }
    get updatedAt()       { return this._updatedAt; }
    get assignedTeacher() { return this._assignedTeacher; }
}