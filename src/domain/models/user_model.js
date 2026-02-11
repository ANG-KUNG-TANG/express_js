import mongoose from "mongoose"
import {UserRole} from "./base/user_enums"

const userSchema = new mongoose.Schema(
    {
        name:{
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength:100
        },
        email:{
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        password:{
            type: String,
            required: true,
            minlength: 8
        },
        role:{
            type: String,
            enum: Object.values(UserRole),
            default: UserRole.USER
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

userSchema.index({email:1});
const UserModel = mongoose.model('User', userSchema)

export default UserModel;