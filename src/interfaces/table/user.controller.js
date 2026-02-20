import { createUserUsecase } from "../../app/user_uc/create_user.uc.js";
import { authenticateUserUseCase } from "../../app/user_uc/auth_User.uc.js";
import { getUseByIdUc, getUserByEamilUc } from "../../app/user_uc/get_user.uc.js";
import { updateUserUseCase } from "../../app/user_uc/update_use.uc.js";
import { deleteUserUc } from "../../app/user_uc/delete_user.uc.js";
import { promoteUserToAdminUseCase } from "../../app/user_uc/promote_user.uc.js";
import { sendSuccess } from '../response_formatter.js';
import { HTTP_STATUS } from '../http_status.js';
import { sanitizeCreateInput, sanitizeUpdateInput, sanitizeAuthInput } from "./user.input_sanitizer.js";
import { generateTokenPair, verifyRefreshToken } from '../../core/services/jwt.service.js';
import { saveRefreshToken } from '../../core/services/token_store.service.js';

const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
};


export const createUser = async (req, res) => {
    const input = sanitizeCreateInput(req.body);
    const user = await createUserUsecase(input);
    return sendSuccess(res, user, HTTP_STATUS.CREATED)
} 

export const loginUser = async (req, res) => {
    const input = sanitizeAuthInput(req.body);
    const user  = await authenticateUserUseCase(input);

    // Issue token pair — same flow as OAuth callbacks
    const payload = {
        id:    user.id    ?? user._id,
        email: user.email ?? user._email,
        role:  user.role  ?? user._role,
    };

    const { accessToken, refreshToken } = generateTokenPair(payload);
    const decoded = verifyRefreshToken(refreshToken);
    saveRefreshToken(decoded.jti, payload.id);

    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    return sendSuccess(res, { accessToken, refreshToken}, HTTP_STATUS.OK);
};

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