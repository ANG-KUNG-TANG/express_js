import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Storage — saves to /uploads on disk
// ---------------------------------------------------------------------------

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(process.cwd(), 'uploads'));
    },
    filename: (req, file, cb) => {
        const ext  = path.extname(file.originalname);
        const name = randomUUID() + ext;
        cb(null, name);
    },
});

// ---------------------------------------------------------------------------
// File filters
// ---------------------------------------------------------------------------

const imageFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
        return cb(new Error('Only JPEG, PNG, WEBP, or GIF images are allowed'));
    }
    cb(null, true);
};

const documentFilter = (req, file, cb) => {
    const allowed = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'text/plain',
    ];
    if (!allowed.includes(file.mimetype)) {
        return cb(new Error('File type not allowed'));
    }
    cb(null, true);
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** Single image — for avatar or cover (5 MB max) */
export const uploadImage = multer({
    storage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
}).single('file');

/** Multiple files — for attachments (10 MB each, max 10 files) */
export const uploadFiles = multer({
    storage,
    fileFilter: documentFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
}).array('files', 10);

/** Build the public URL for a stored file */
export const buildFileUrl = (req, storedName) => {
    return `${req.protocol}://${req.get('host')}/uploads/${storedName}`;
};