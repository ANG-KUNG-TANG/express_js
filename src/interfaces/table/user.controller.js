import { createUserUsecase } from "../../app/user_uc/create_user.uc.js";
import { authenticateUserUseCase } from "../../app/user_uc/auth_User.uc.js";
import { getUseByIdUc, getUserByEamilUc } from "../../app/user_uc/get_user.uc.js";
import { updateUserUseCase } from "../../app/user_uc/update_use.uc.js";
import { deleteUserUc } from "../../app/user_uc/delete_user.uc.js";
import { promoteUserToAdminUseCase } from "../../app/user_uc/promote_user.uc.js";
import {sendSuccess} from '../response_formatter.js'
import { HTTP_STATUS } from '../http_status.js'
import { sanitizeCreateInput, sanitizeUpdateInput, sanitizeAuthInput } from "./user.input_sanitizer.js";


export const createUser = async (req, res) => {
    const input = sanitizeCreateInput(req.body);
    const user = await createUserUsecase(input);
    return sendSuccess(res, user, HTTP_STATUS.CREATED)
} 

export const loginUser = async(req, res) =>{
    const input = sanitizeAuthInput(req.body);
    const user = await authenticateUserUseCase(input);
    return sendSuccess(res, user, HTTP_STATUS.OK);
}

export const getUserById = async (req, res) => {
    const { id } = req.params;
    console.log('ID received:', id); 
    const user = await getUseByIdUc(id);
    return sendSuccess(res, user, HTTP_STATUS.OK);
};

export const getUserByEamil = async(req, res) =>{
    const {email} = req.params;
    const user = await getUserByEamilUc(email);
    return sendSuccess(res, user, HTTP_STATUS.OK);
}

export const updateUser = async (req, res) =>{
    const {id} = req.params;
    const updates = sanitizeUpdateInput(req.body);
    const user = await updateUserUseCase(id, updates)
    return sendSuccess(res, user, HTTP_STATUS.OK)
}

export const deleteUser = async(req, res) =>{
    const {id} = req.params;
    const result = await deleteUserUc(id);
    return sendSuccess(res,result, HTTP_STATUS.OK);
}

export const promoteUser = async (req,res) =>{
    const {id} =req.params;
    const user = await promoteUserToAdminUseCase(id);
    return sendSuccess(res, user, HTTP_STATUS.OK);
}