import { Router } from "express";
import { asyncHandler } from "../async_handler.js";
import {
    createUser,
    loginUser,
    getUserByEamil,
    getUserById,
    updateUser,
    deleteUser,
    promoteUser,
} from "./user.controller.js";

const router = Router();

router.post('/auth/login',              asyncHandler(loginUser));
router.post('/users',                   asyncHandler(createUser));
router.get('/users/email/:email',       asyncHandler(getUserByEamil));
router.get('/users/:id',                asyncHandler(getUserById));
router.patch('/users/:id/promote',      asyncHandler(promoteUser));
router.patch('/users/:id',              asyncHandler(updateUser));
router.delete('/users/:id',             asyncHandler(deleteUser));

export default router;