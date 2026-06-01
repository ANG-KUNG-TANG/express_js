import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const SEPARATOR = ':';

export const hashPassword = (plainText) => {
    const salt = randomBytes(SALT_LENGTH).toString('hex');
    const hash = scryptSync(plainText, salt, KEY_LENGTH).toString('hex');
    return `${salt}${SEPARATOR}${hash}`;
};

export const verifyPassword = (plainText, stored) => {
    const separatorIndex = stored.indexOf(SEPARATOR);  
    const salt = stored.substring(0, separatorIndex);
    const storedHash = stored.substring(separatorIndex + 1);

    const attemptHash = scryptSync(plainText, salt, KEY_LENGTH); 
    const storedHashBuffer = Buffer.from(storedHash, 'hex');     

    // Guard against malformed stored hash
    if (attemptHash.length !== storedHashBuffer.length) {
        throw new RangeError(`Buffer length mismatch: ${attemptHash.length} vs ${storedHashBuffer.length}`);
    }

    return timingSafeEqual(attemptHash, storedHashBuffer);
};