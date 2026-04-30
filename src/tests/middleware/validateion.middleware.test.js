// ==============================
// 8. validation.middleware.test.js
// ==============================
import { jest, beforeEach, describe, it, expect, beforeAll } from '@jest/globals';

const mockValidationResult = jest.fn();
jest.unstable_mockModule('express-validator', () => ({
    validationResult: mockValidationResult,
}));

let validate;
beforeAll(async () => {
    validate = (await import('../../middleware/validation.middleware.js')).validate;
});

const next = jest.fn();
beforeEach(() => jest.clearAllMocks());

describe('validation.middleware', () => {
    it('calls next() when validationResult is empty', () => {
        const req = {};
        const res = {};
        mockValidationResult.mockReturnValue({ isEmpty: () => true });
        validate(req, res, next);
        expect(next).toHaveBeenCalledWith();
    });

    it('passes an error with 400 status and errors array on failure', () => {
        const req = {};
        const res = {};
        const errorsArray = [
            { path: 'email', msg: 'Invalid email' },
            { path: 'password', msg: 'Too short' },
        ];
        mockValidationResult.mockReturnValue({ isEmpty: () => false, array: () => errorsArray });
        validate(req, res, next);
        const passedError = next.mock.calls[0][0];
        expect(passedError).toBeInstanceOf(Error);
        expect(passedError.statusCode).toBe(400);
        expect(passedError.errors).toEqual(errorsArray);
    });
});