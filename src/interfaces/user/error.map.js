/**
 * Error Map
 *
 * Maps typed domain/application error class names to HTTP status codes.
 * This is the single source of truth for error → status mapping.
 * Add new error classes here as the domain grows.
 */

import { HTTP_STATUS } from '../http_status.js';

export const ERROR_STATUS_MAP = {
    // 400 — Validation / bad input
    UserValidationError:      HTTP_STATUS.BAD_REQUEST,
    UserNameRequiredError:    HTTP_STATUS.BAD_REQUEST,
    UserNameTooShortError:    HTTP_STATUS.BAD_REQUEST,
    UserNameTooLongError:     HTTP_STATUS.BAD_REQUEST,
    UserInvalidEmailError:    HTTP_STATUS.BAD_REQUEST,
    UserPasswordTooWeakError: HTTP_STATUS.BAD_REQUEST,
    UserInvalidRoleError:     HTTP_STATUS.BAD_REQUEST,

    // 401 — Authentication failure
    // NOTE: message must never expose which field (email or password) was wrong
    InvalidCredentialsError:  HTTP_STATUS.UNAUTHORIZED,

    // 404 — Resource not found
    UserNotFoundError:        HTTP_STATUS.NOT_FOUND,
    UserEmailNotFoundError:   HTTP_STATUS.NOT_FOUND,

    // 409 — State conflict
    UserAlreadyAdminError:    HTTP_STATUS.CONFLICT,
};