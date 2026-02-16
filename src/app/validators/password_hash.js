import { randomBytes, scryptSync, timingSafeEqual} from 'crypto';

const SALT_LENGTH =16;
const KEY_LENGTH = 64;
const SEPARATOR  =':';

export const hashPassword = (plainText) =>{
    const salt = randomBytes(SALT_LENGTH).toString('hex');
    const hash = scryptSync(plainText, salt, KEY_LENGTH).toString('hex');
    return `${salt} ${SEPARATOR} ${hash}`;
};

export const verifyPassword = (plainText, stored) =>{
    const [salt, sotredHash] = stored.split(SEPARATOR);
    const attemptHash = scryptSync(plainText, salt, KEY_LENGTH);
    const storedHashBuffer = Buffer.from(storedHash, 'hex');
    return timingSafeEqual(attemptHash, storedHashBuffer);
}