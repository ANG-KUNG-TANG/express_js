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
        if (!name || name.length < 3 ) throw new Error("Name is required and name must greater than 3");
        if (!email || !email.includes('@')) throw new Error("Invalid email");
        if (!password || password.length< 8) throw new Error("Weak Password");
        if (!role) throw new Error("Invalid user role")

        this._id=id ?? UniqueId.generator()
        this._name = name
        this._email = email
        this._password = password
        this._role = role ?? UserRole.ADMIN
        this._createdAt = createdAt
        this._updatedAt  = updatedAt
    }
    promoteToAdmin(){
        this._role = UserRole.ADMIN
        this._updatedAt = new Date();
    }
    get id(){
        return this._id
    }
    get role(){
        return this._role
    }
}