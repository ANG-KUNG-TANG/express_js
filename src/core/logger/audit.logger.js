import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from "fs";

const __dirname= path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.resolve(__dirname, '../../../logs');  // fixed: '.../.../../' → '../../../'

if (!fs.existsSync(LOG_DIR)){                             // fixed: 'fsexistsSync' → 'fs.existsSync'
    fs.mkdirSync(LOG_DIR, {recursive: true});             // fixed: 'ture' → 'true'
};

const auditFormat = winston.format.combine(               // fixed: 'autditFormat' → 'auditFormat'
    winston.format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss"                    // fixed: 'YYY-MM-DD' → 'YYYY-MM-DD'
    }),
    winston.format.json()
);

const auditWinston = winston.createLogger({
    level: "info",
    transports: [                                         // fixed: 'transprots' → 'transports'
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'audit.log'),    // fixed: 'audit.lgo' → 'audit.log'
            format: auditFormat,                          // fixed: 'autditFormat' → 'auditFormat'
            maxsize : 10 * 1024 * 1024,                  // fixed: '1034' → '1024'
            maxFiles: 20,
            tailable: true,
        }),

        ...(process.env.NODE_ENV !== 'production'
            ? [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.timestamp({ format: "HH:mm:ss" }), // ✅ FIX 1: timestamp must be added before printf can destructure it
                        winston.format.colorize(),
                        winston.format.printf(
                            ({timestamp, message}) => `[AUDIT ${timestamp}] ${message}`
                        )
                    )
                })
            ]
        : []),
    ],
    exitOnError: false
});

// ── Public audit logger interface ─────────────────────────────────────────────

/**
 * Record an audit event.
 *
 * @param {string}  action   - Dot-namespaced action label  e.g. "vocab.created"
 * @param {Object}  details  - Any extra context  e.g. { word, topic, savedCount }
 * @param {Request} req      - Express request object — REQUIRED for requestId, IP, method, path.
 *                             Pass `null` only for system-level (non-HTTP) events.
 * @param {'success'|'failure'} [outcome] - Defaults to 'success'
 */
const log = (action, details = {}, req = null, outcome = "success") => {
  const entry = {
    action,
    outcome,
    details,
    ...(req && {
      request: {
        method: req.method,
        path: req.originalUrl || req.path,
        ip: req.ip || req.headers?.["x-forwarded-for"] || "unknown",
        userAgent: req.headers?.["user-agent"] || "unknown",
        requestId: req.id || null,
      },
    }),
  };

  auditWinston.info(action, entry);
};

/**
 * Shorthand for a failed audit event.
 */
const failure = (action, details = {}, req = null) =>
  log(action, details, req, "failure");

const auditLogger = { log, failure };

export default auditLogger;