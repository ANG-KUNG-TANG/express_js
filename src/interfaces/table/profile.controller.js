import { updateProfileInfoUseCase } from '../../app/profile/update_profile.uc.js';
import { uploadAvatarUseCase }       from '../../app/profile/upload_avatar.uc.js';
import { uploadCoverUseCase } from '../../app/profile/upload_cover.uc.js';
import { uploadFileUseCase }         from '../../app/profile/upload_file.uc.js';
import { deleteFileUseCase }         from '../../app/profile/delete_file.uc.js';
import { getFilesUseCase } from '../../app/profile/get_file.uc.js';
import { buildFileUrl } from '../../middleware/upload.middleware.js';
import { sendSuccess }               from '../response_formatter.js';
import { HTTP_STATUS }               from '../http_status.js';
import * as userRepo                 from '../../infrastructure/repositories/user_repo.js';
import logger                        from '../../core/logger/logger.js';
import auditLogger                   from '../../core/logger/audit.logger.js';

// ---------------------------------------------------------------------------
// GET /api/users/me
// ---------------------------------------------------------------------------

export const getMyProfile = async (req, res) => {
    const userId = req.user.id;

    logger.debug('profile.getMyProfile called', { requestId: req.id, userId });

    const user = await userRepo.findUserById(userId);

    return sendSuccess(res, userRepo.sanitizeUser(user), HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// PATCH /api/users/me
// ---------------------------------------------------------------------------

export const updateMyProfile = async (req, res) => {
    const userId = req.user.id;
    const { name, email, bio, targetBand, examDate } = req.body;

    logger.debug('profile.updateMyProfile called', { requestId: req.id, userId });

    const user = await updateProfileInfoUseCase(userId, { name, email, bio, targetBand, examDate });

    auditLogger.log('profile.updated', { userId }, req);

    return sendSuccess(res, user, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// POST /api/users/me/avatar
// ---------------------------------------------------------------------------

export const uploadAvatar = async (req, res) => {
    const userId = req.user.id;

    logger.debug('profile.uploadAvatar called', { requestId: req.id, userId });

    if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: { message: 'No file uploaded' } });
    }

    const avatarUrl = buildFileUrl(req, req.file.filename);

    const user = await uploadAvatarUseCase(userId, {
        avatarUrl,
        mimetype: req.file.mimetype,
        size:     req.file.size,
    });

    auditLogger.log('profile.avatar_updated', { userId, avatarUrl }, req);

    return sendSuccess(res, { avatarUrl: user._avatarUrl }, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// POST /api/users/me/cover
// ---------------------------------------------------------------------------

export const uploadCover = async (req, res) => {
    const userId = req.user.id;

    logger.debug('profile.uploadCover called', { requestId: req.id, userId });

    if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: { message: 'No file uploaded' } });
    }

    const coverUrl = buildFileUrl(req, req.file.filename);

    const user = await uploadCoverUseCase(userId, {
        coverUrl,
        mimetype: req.file.mimetype,
        size:     req.file.size,
    });

    auditLogger.log('profile.cover_updated', { userId, coverUrl }, req);

    return sendSuccess(res, { coverUrl: user._coverUrl }, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// POST /api/users/me/files
// ---------------------------------------------------------------------------

export const uploadAttachments = async (req, res) => {
    const userId = req.user.id;

    logger.debug('profile.uploadAttachments called', { requestId: req.id, userId, count: req.files?.length });

    if (!req.files || req.files.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: { message: 'No files uploaded' } });
    }

    let lastUser;
    for (const file of req.files) {
        lastUser = await uploadFileUseCase(userId, {
            originalName: file.originalname,
            storedName:   file.filename,
            mimetype:     file.mimetype,
            size:         file.size,
            url:          buildFileUrl(req, file.filename),
        });
    }

    auditLogger.log('profile.files_uploaded', { userId, count: req.files.length }, req);

    return sendSuccess(res, { attachments: lastUser._attachments }, HTTP_STATUS.CREATED);
};

// ---------------------------------------------------------------------------
// GET /api/users/me/files
// ---------------------------------------------------------------------------

export const getAttachments = async (req, res) => {
    const userId = req.user.id;

    logger.debug('profile.getAttachments called', { requestId: req.id, userId });

    const attachments = await getFilesUseCase(userId);

    return sendSuccess(res, { attachments }, HTTP_STATUS.OK);
};

// ---------------------------------------------------------------------------
// DELETE /api/users/me/files/:fileId
// ---------------------------------------------------------------------------

export const deleteAttachment = async (req, res) => {
    const userId = req.user.id;
    const { fileId } = req.params;

    logger.debug('profile.deleteAttachment called', { requestId: req.id, userId, fileId });

    const result = await deleteFileUseCase(userId, fileId);

    auditLogger.log('profile.file_deleted', { userId, fileId }, req);

    return sendSuccess(res, result, HTTP_STATUS.OK);
};