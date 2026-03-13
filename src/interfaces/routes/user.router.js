import { Router } from "express";
import { asyncHandler } from "../async_handler.js";
import {
    createUser,
    getUserByEamil,
    getUserById,
    updateUser,
    deleteUser,
    promoteUser,
    listUsers,
} from "../table/user.controller.js";

const router = Router();


// ── User CRUD ─────────────────────────────────────────────────────────────────
router.post('/users',               asyncHandler(createUser));
router.get('/list_users',           asyncHandler(listUsers));
router.get('/users/email/:email',   asyncHandler(getUserByEamil));
router.get('/users/:id',            asyncHandler(getUserById));
router.patch('/users/:id/promote',  asyncHandler(promoteUser));
router.put('/users/:id',            asyncHandler(updateUser));    // FIX: frontend sends PUT, was only PATCH
router.patch('/users/:id',          asyncHandler(updateUser));    // keep PATCH too for flexibility
router.delete('/users/:id',         asyncHandler(deleteUser));

export default router;