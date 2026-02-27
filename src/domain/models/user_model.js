import mongoose from "mongoose"
import { UserRole } from "../../domain/base/user_enums.js"
import { NewsCategory } from "../base/new_enums.js";

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
        },
        interests: {
            type: [String],
            enum: Object.values(NewsCategory),
            default: [],
            validate: {
                validator: (arr) => arr.length <= 5,
                message: "you can select up to 5 interest categories",
            }
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

const UserModel = mongoose.model('User', userSchema);

export default UserModel;