import { Router } from "express";
import { asyncHandler } from "../async_handler.js";
import { authenticate } from "../../middleware/auth.middelware.js";
import { uploadImage, uploadFiles } from "../../middleware/upload.middleware.js";
import {
    getMyProfile,
    updateMyProfile,
    uploadAvatar,
    uploadCover,
    uploadAttachments,
    getAttachments,
    deleteAttachment,
} from "../table/profile.controller.js";

const router = Router();

// wrap multer so its errors flow into the global error handler

const handelUpload = (multerfn) => (req, res, next) =>{
    multerfn(req, res, (err) =>{
        if (err) return next(err);
        next();
    });
};

// All profile routes require a valid JWT
router.use(authenticate);

// ── Profile info ──────────────────────────────────────────────────────────────
router.get  ('/users/me',                   asyncHandler(getMyProfile));
router.patch('/users/me',                   asyncHandler(updateMyProfile));

// ── Avatar & cover ────────────────────────────────────────────────────────────
router.post ('/users/me/avatar',            handelUpload(uploadImage),  asyncHandler(uploadAvatar));
router.post ('/users/me/cover',             handelUpload(uploadImage),  asyncHandler(uploadCover));

// ── File attachments ──────────────────────────────────────────────────────────
router.get   ('/users/me/files',            asyncHandler(getAttachments));
router.post  ('/users/me/files',            handelUpload(uploadFiles),  asyncHandler(uploadAttachments));
router.delete('/users/me/files/:fileId',    asyncHandler(deleteAttachment));

export default router;