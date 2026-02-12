import UserModel from "../../domain/models/user_model";
import { User } from "../../domain/entities/user_entity";
import { UserRole } from "../../domain/base/user_enums";
import mongoose from 'mongoose';
import {
    UserNotFoundError,
    UserEmailNotFoundError,
    UserValidationError,
    UserNameTooShortError,
    UserInvalidEmailError,
    UserPasswordTooWeakError,
    UserEmailAlreadyExistsError,
    UserAlreadyAdminError,
    InvalidCredentialsError,
    UserInsufficientPermissionError
} from './src/errosrs&exceptons/user.errors.js';


const toDomain = (doc) =>{
    if (!doc) return null;
    return new User({
        id: doc._id.toString(),
        name: doc.name,
        email: doc.email,
        password: doc.password,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
    });
};

const toDomainList = (docs)=> docs.map(toDomain).filter(u => u !== null);

const toPersistence = (user) => {
    if (!user) return null;
    return {
        ...(user._id && { _id: new mongoose.Types.ObjectId(user._id) }),
        name: user._name,
        email: user._email.toLowerCase(),
        password: user._password,
        role: user._role,
        createdAt: user._createdAt,
        updatedAt: user._updatedAt
    };
};

export const sanitizeUser = (user) =>{
    if (!user) return null;
    return{
        id: user.id,
        name: user._name,
        email: user.email,
        role: user._role,
        createdAt: user._createdAt,
        updatedAt: user._updatedAt
    };
};

export const findUserById = async (id) =>{
    if (!mongoose.Types.ObjectId.isVlid(id)){
        throw new UserValidationError('invalid user id format')
    }
    const doc = await UserModel.findUserById(id).lean();
    if (!doc) throw new UserEmailNotFoundError(id);
    return toDomain(doc)
}

export const findUserByEmail= async (id) => {
    const doc = await UserModel.findOne({email: email.toLowerCase()}).lean();
    if (!doc) throw new UserEmailAlreadyExistsError(email);
    return toDomain(doc);
}

export const createUser = async (userData) => {
    const existing = await UserModel.findOne({email: userData.email.toLowerCase()});
    if (existing) throw new UserEmailAlreadyExistsError(userData.email)
    const user = new User(userData);
    const persistence = toPersistence(user);
    const [doc] = await UserModel.create([persistence]);
    return toDomain(doc);
}

export const authenticateUser = async(email,password) =>{
    const user = await findUserByEmail(email);
    if (user._password != password){
        throw new InvalidCredentialsError();
    }
    return sanitizeUser(user);
}

export const promoteToAdmin = async (id) => {
    const user = await findUserById(id);
    user.promoteToAdmin();
    return await updateUser(id, {role: user._role, updatedAt: new Date()});
}