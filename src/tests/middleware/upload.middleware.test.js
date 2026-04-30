// src/tests/middleware/upload.middleware.test.js
import { jest, describe, it, expect, beforeAll } from '@jest/globals';

const mockSingle = jest.fn();
const mockArray = jest.fn();
const mockMulterInstance = { single: mockSingle, array: mockArray };
const mockMulter = jest.fn(() => mockMulterInstance);
mockMulter.diskStorage = jest.fn(() => ({}));

jest.unstable_mockModule('multer', () => ({ default: mockMulter }));

let uploadImage, uploadFiles, buildFileUrl, multer;
beforeAll(async () => {
    const mod = await import('../../middleware/upload.middleware.js');
    uploadImage = mod.uploadImage;
    uploadFiles = mod.uploadFiles;
    buildFileUrl = mod.buildFileUrl;
    multer = (await import('multer')).default;
});

// No beforeEach – keep mock call history intact

describe('buildFileUrl', () => {
    it('builds correct file URL', () => {
        const req = { protocol: 'http', get: jest.fn().mockReturnValue('localhost:3000') };
        expect(buildFileUrl(req, 'photo.jpg')).toBe('http://localhost:3000/uploads/photo.jpg');
    });
});

describe('multer setup', () => {
    it('exports uploadImage as single file middleware', () => {
        const calls = multer.mock.calls;
        const imgCall = calls.find(c => c[0]?.limits?.fileSize === 5 * 1024 * 1024);
        expect(imgCall).toBeTruthy();
        expect(imgCall[0]).toMatchObject({
            storage: expect.any(Object),
            fileFilter: expect.any(Function),
            limits: { fileSize: 5 * 1024 * 1024 },
        });
        expect(mockSingle).toHaveBeenCalledWith('file');
        expect(uploadImage).toBe(mockSingle.mock.results[0].value);
    });

    it('exports uploadFiles as array middleware', () => {
        const calls = multer.mock.calls;
        const fileCall = calls.find(c => c[0]?.limits?.fileSize === 10 * 1024 * 1024);
        expect(fileCall).toBeTruthy();
        expect(mockArray).toHaveBeenCalledWith('files', 10);
        expect(uploadFiles).toBe(mockArray.mock.results[0].value);
    });

    it('imageFilter rejects disallowed mime types', () => {
        const imgCall = multer.mock.calls.find(c => c[0]?.limits?.fileSize === 5 * 1024 * 1024);
        const filter = imgCall[0].fileFilter;
        const cb = jest.fn();
        filter({}, { mimetype: 'application/pdf' }, cb);
        expect(cb).toHaveBeenCalledWith(expect.any(Error));
        cb.mockClear();
        filter({}, { mimetype: 'image/png' }, cb);
        expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('documentFilter rejects disallowed mime types', () => {
        const fileCall = multer.mock.calls.find(c => c[0]?.limits?.fileSize === 10 * 1024 * 1024);
        const filter = fileCall[0].fileFilter;
        const cb = jest.fn();
        filter({}, { mimetype: 'application/x-msdownload' }, cb);
        expect(cb).toHaveBeenCalledWith(expect.any(Error));
        cb.mockClear();
        filter({}, { mimetype: 'application/pdf' }, cb);
        expect(cb).toHaveBeenCalledWith(null, true);
    });
});