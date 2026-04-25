import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.resolve(__dirname, '../../../logs');

if (!fs.existsSync(LOG_DIR)){
    fs.mkdirSync(LOG_DIR, {recursive: true});
}

const baseFormat = winston.format.combine(
    winston.format.timestamp({format: "YYYY-MM-DD HH:mm:ss"}),
    winston.format.errors({stack: true}),
    winston.format.splat(),
    winston.format.json()
)

const consoleFormat = winston.format.combine(
    winston.format.colorize({all:true}),
    winston.format.timestamp({format: "HH:mm:ss"}),
    winston.format.printf(({timestamp, level, message, ...meta})=>{
        const metaStr = Object.keys(meta).length
        ? "\n" + JSON.stringify(meta,null, 2).replace(/\n/g, '\n')
        : "";
        return `[${timestamp} ${level} : ${message}${metaStr}]`;
    })
);

const transports = [
    new winston.transports.Console({
        level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn': 'debug'),
        format: consoleFormat,
    }),
    new winston.transports.File({
        filename: path.join(LOG_DIR, 'error.log'),
        level: "error",
        format: baseFormat,
        maxsize: 5 * 1024 * 1024,
        maxFiles: 5,
        tailable: true
    }),
    new winston.transports.File({
        filename: path.join(LOG_DIR, 'combined.log'),
        level: 'debug',
        format: baseFormat,
        maxsize: 10 * 1024 * 1024,
        maxFiles: 10,
        tailable: true
    })
];

const logger = winston.createLogger({
    level: "debug",
    transports,
    exitOnError: false,
})

export default logger;