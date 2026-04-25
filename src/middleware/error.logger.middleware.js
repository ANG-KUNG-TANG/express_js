import logger from "../core/logger/logger.js"
import auditLogger from "../core/logger/audit.logger.js";
import { HTTP_STATUS } from ".././interfaces/http_status.js ";

// Map custom error names → HTTP status codes
const ERROR_STATUS_MAP = {
  InvalidTopicError:          HTTP_STATUS.BAD_REQUEST,         // 400
  VocabularyRuleViolationError: HTTP_STATUS.UNPROCESSABLE_ENTITY, // 422
  DuplicateVocabularyError:   HTTP_STATUS.CONFLICT,            // 409
  VocabularyNotFoundError:    HTTP_STATUS.NOT_FOUND,           // 404
  ValidationError:            HTTP_STATUS.BAD_REQUEST,         // 400 (Mongoose)
};

// Errors that are "expected" operational errors — logged at warn, not error
const OPERATIONAL_ERRORS = new Set(Object.keys(ERROR_STATUS_MAP));

// eslint-disable-next-line no-unused-vars
export const errorLoggerMiddleware = (err, req, res, next) => {
  const status = ERROR_STATUS_MAP[err.name] || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const isOperational = OPERATIONAL_ERRORS.has(err.name);

  // ── Logging ────────────────────────────────────────────────
  const logPayload = {
    requestId: req.id,
    errorName: err.name,
    message: err.message,
    status,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    ...(err.details && { details: err.details }),
    ...(!isOperational && { stack: err.stack }),  // only log stack for unexpected errors
  };

  if (isOperational) {
    logger.warn("Operational error", logPayload);
  } else {
    logger.error("Unexpected error", logPayload);
  }

  // ── Audit trail for failures ───────────────────────────────
  auditLogger.failure(`request.error.${err.name || "UnknownError"}`, {
    message: err.message,
    status,
    ...(err.details && { details: err.details }),
  }, req);

  // ── Response ───────────────────────────────────────────────
  const responseBody = {
    success: false,
    error: {
      name: err.name || "InternalServerError",
      message: err.message || "An unexpected error occurred",
      ...(err.details && { details: err.details }),
      requestId: req.id,
    },
  };

  // Never expose stack traces to the client in production
  if (process.env.NODE_ENV !== "production" && !isOperational) {
    responseBody.error.stack = err.stack;
  }

  res.status(status).json(responseBody);
};