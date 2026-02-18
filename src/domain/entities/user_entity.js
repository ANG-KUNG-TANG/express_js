import { UniqueId } from "../base/id_generator.js";
import { UserRole } from "../base/user_enums.js";
import {
    UserNameRequiredError,
    UserNameTooShortError,
    UserNameTooLongError,
    UserInvalidEmailError,
    UserPasswordTooWeakError,
    UserInvalidRoleError,
    UserAlreadyAdminError,
} from "../../core/errors/user.errors.js";

export class User{
    constructor(props){
        this._initialize(props)
    }
    _initialize({
        id,
        name,
        email,
        password,
        role = UserRole.USER,
        createdAt = new Date(),
        updatedAt = new Date()
    }){
        this._validateName(name);
        this._validateEmail(email);
        this._validatePassword(password);
        this._validateRole(role);

        this._id = id || new UniqueId().generator();
        this._name = name;
        this._email = email;
        this._password = password;
        this._role = role;
        this._createdAt = createdAt;
        this._updatedAt = updatedAt;
    }

    _validateName(name){
        if (!name) throw new UserNameRequiredError();
        if (name.trim().length < 3) throw new UserNameTooShortError(3);
        if (name.trim().length > 100) throw new UserNameTooLongError(100);
    }

    _validateEmail(email){
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailPattern.test(email)) throw new UserInvalidEmailError(email);
    }

    _validatePassword(password){
        if (!password || password.length < 8) throw new UserPasswordTooWeakError(8);
    }

    _validateRole(role){
        if (!Object.values(UserRole).includes(role)) throw new UserInvalidRoleError(role);
    }

    promoteToAdmin(){
        if(this._role === UserRole.ADMIN) throw new UserAlreadyAdminError();
        this._role = UserRole.ADMIN;
        this._updatedAt = new Date();
    }

    get id(){ return this._id }
    get name(){ return this._name }
    get email(){ return this._email }
    get role(){ return this._role }
    get password(){ return this._password }
    get createdAt(){ return this._createdAt }
    get updatedAt(){ return this._updatedAt }
}