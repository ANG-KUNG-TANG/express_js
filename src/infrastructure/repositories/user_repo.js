// import UserModel from "../../domain/models/user_model";
// import { User } from "../../domain/entities/user_entity";
// import { UserRole } from "../../domain/base/user_enums";
// import mongoose from 'mongoose';
// import { use } from "react";

// const toDomain = (doc) =>{
//     if (!doc) return null;
//     return new User({
//         id: doc._id.toString(),
//         name: doc.name,
//         email: doc.email,
//         password: doc.password,
//         createdAt: doc.createdAt,
//         updatedAt: doc.updatedAt
//     });
// };

// const toDomainList = (docs)=> docs.map(toDomain).filter(u => u ! == null);

// const toPersistence = (user) => {
//     if (!user) return null;
//     return {
//         ...(user._id && { _id: new mongoose.Types.ObjectId(user._id) }),
//         name: user._name,
//         email: user._email.toLowerCase(),
//         password: user._password,
//         role: user._role,
//         createdAt: user._createdAt,
//         updatedAt: user._updatedAt
//     };
// };

// export const sanitizeUser = (user) =>{
//     if (!user) return null;
//     return{
//         id: user.id,
//         name: user._name,
//         email: user.email,
//         role: user._role,
//         createdAt: user._createdAt,
//         updatedAt: user._updatedAt
//     };
// };

// export const findUserById = async (id) =>{
//     try {
//         const doc = await UserModel.findUserById(id).lean();
//         return toDomain(doc);
//     }catch (error){
//         throw new Error(`[UserRepo] findUserById: ${error.message}`)
//     }
// }

// export const findUserByEmail= async (id) => {
//     try {
//         const doc = await UserModel.findOne({email: email.toLowerCase()}).lean();
//         return toDomain(doc);
//     }catch Error{
//         throw new Error``
//     }
// }