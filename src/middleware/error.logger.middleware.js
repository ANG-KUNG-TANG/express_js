// error.logger.middleware.js
import logger from "../core/logger/logger.js"
import auditLogger from "../core/logger/audit.logger.js";
import { HTTP_STATUS } from "../interfaces/http_status.js";

const ERROR_STATUS_MAP = {
  // ── vocab ─────────────────────────────────────────────────
  InvalidTopicError:                  HTTP_STATUS.BAD_REQUEST,
  VocabularyRuleViolationError:        HTTP_STATUS.UNPROCESSABLE_ENTITY,
  DuplicateVocabularyError:            HTTP_STATUS.CONFLICT,
  VocabularyNotFoundError:             HTTP_STATUS.NOT_FOUND,
  ValidationError:                     HTTP_STATUS.BAD_REQUEST,

  // ── user / auth ───────────────────────────────────────────
  InvalidCredentialsError:             HTTP_STATUS.UNAUTHORIZED,
  UserNotAuthenticatedError:           HTTP_STATUS.UNAUTHORIZED,
  EmailNotVerifiedError:               HTTP_STATUS.FORBIDDEN,
  AccountSuspendedError:               HTTP_STATUS.FORBIDDEN,
  UserInsufficientPermissionError:     HTTP_STATUS.FORBIDDEN,
  UserEmailAlreadyExistsError:         HTTP_STATUS.CONFLICT,
  UserNotFoundError:                   HTTP_STATUS.NOT_FOUND,
  UserEmailNotFoundError:              HTTP_STATUS.NOT_FOUND,
  UserFileNotFoundError:               HTTP_STATUS.NOT_FOUND,
  UserValidationError:                 HTTP_STATUS.BAD_REQUEST,
  UserNameRequiredError:               HTTP_STATUS.BAD_REQUEST,
  UserNameTooShortError:               HTTP_STATUS.BAD_REQUEST,
  UserNameTooLongError:                HTTP_STATUS.BAD_REQUEST,
  UserInvalidEmailError:               HTTP_STATUS.BAD_REQUEST,
  UserPasswordTooWeakError:            HTTP_STATUS.BAD_REQUEST,
  UserInvalidRoleError:                HTTP_STATUS.BAD_REQUEST,
  UserInvalidAvatarTypeError:          HTTP_STATUS.BAD_REQUEST,
  UserAvatarTooLargeError:             HTTP_STATUS.BAD_REQUEST,
  UserInvalidCoverTypeError:           HTTP_STATUS.BAD_REQUEST,
  UserCoverTooLargeError:              HTTP_STATUS.BAD_REQUEST,
  UserInvalidFileTypeError:            HTTP_STATUS.BAD_REQUEST,
  UserFileTooLargeError:               HTTP_STATUS.BAD_REQUEST,
  UserBioTooLongError:                 HTTP_STATUS.BAD_REQUEST,
  UserBusinessRuleError:               HTTP_STATUS.UNPROCESSABLE_ENTITY,
  UserAlreadyAdminError:               HTTP_STATUS.CONFLICT,

  // ── password reset ────────────────────────────────────────
  PasswordResetTokenExpiredError:      HTTP_STATUS.BAD_REQUEST,
  PasswordResetTokenAlreadyUsedError:  HTTP_STATUS.BAD_REQUEST,
  PasswordResetTokenNotFoundError:     HTTP_STATUS.BAD_REQUEST,
  PasswordResetUserNotFoundError:      HTTP_STATUS.OK,           // 200 — enum obfuscation
};

const OPERATIONAL_ERRORS = new Set(Object.keys(ERROR_STATUS_MAP));

// eslint-disable-next-line no-unused-vars
export const errorLoggerMiddleware = (err, req, res, next) => {
  const status =
    ERROR_STATUS_MAP[err.name] ??
    err.statusCode ??
    HTTP_STATUS.INTERNAL_SERVER_ERROR;

  const isOperational = OPERATIONAL_ERRORS.has(err.name) || (err.statusCode && err.statusCode < 500);

  const logPayload = {
    requestId: req.id,
    errorName: err.name,
    message: err.message,
    status,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    ...(err.details && { details: err.details }),
    ...(!isOperational && { stack: err.stack }),
  };

  if (isOperational) {
    logger.warn("Operational error", logPayload);
  } else {
    logger.error("Unexpected error", logPayload);
  }

  auditLogger.failure(`request.error.${err.name || "UnknownError"}`, {
    message: err.message,
    status,
    ...(err.details && { details: err.details }),
  }, req);

  const responseBody = {
    success: false,
    error: {
      name: err.name || "InternalServerError",
      message: err.message || "An unexpected error occurred",
      ...(err.details && { details: err.details }),
      requestId: req.id,
    },
  };

  if (process.env.NODE_ENV !== "production" && !isOperational) {
    responseBody.error.stack = err.stack;
  }

  res.status(status).json(responseBody);
};