import e from "cors";
import { UniqueId } from "../base/id_generator";
import { UserRole } from "../base/user_enums";

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
        this._vllidateEmail(email);
        this._validatePassword(password);
        this._vllidateRole(role);

        this._id=id ?? UniqueId.generator()
        this._name = name
        this._email = email
        this._password = password
        this._role = role ?? UserRole.ADMIN
        this._createdAt = createdAt
        this._updatedAt  = updatedAt
    }
    
    _validateName(name){
        if (!name || name.trim().length < 3 ) {throw new Error("Name is required and name must greater than 3")};
    }
    _vllidateEmail(email){
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailPattern.test(email)) {throw new Error("Invalid email")};
    }

    _validatePassword(password){
        if (!password || password.length< 8) {throw new Error("Weak Password")};

    }
    _vllidateRole(role){
        if (!Object.values(UserRole).includes(role)) {throw new Error("Invalid user role")}
    }
    promoteToAdmin(){
        if(this._role === UserRole.ADMIN){
            {throw new Error("User is already admin")}
        }
        this._role = UserRole.ADMIN
        this._updatedAt = new Date();
    }
    get id(){
        return this._id
    }
    get role(){
        return this._role
    }
    get email(){
        return this._email
    }
}