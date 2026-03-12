import { scryptSync, randomBytes } from 'crypto';
import mongoose from 'mongoose';
import 'dotenv/config';

// ── Change these two values ───────────────────────────────────────────────────
const TARGET_EMAIL = 'johndev@gmail.com';
const NEW_PASSWORD = 'NewPassword123!';   // ← set your new password here
// ─────────────────────────────────────────────────────────────────────────────

const hashPassword = (plainText) => {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(plainText, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

const MONGO_URI = process.env.MONGO_URI
    || process.env.DATABASE_URL
    || process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.error('❌ No MONGO_URI found in .env');
    process.exit(1);
}

await mongoose.connect(MONGO_URI);
console.log('✅ Connected to DB\n');

const newHash = hashPassword(NEW_PASSWORD);

const result = await mongoose.connection.collection('users').updateOne(
    { email: TARGET_EMAIL },
    { $set: { password: newHash } }
);

if (result.matchedCount === 0) {
    console.error(`❌ No user found with email: ${TARGET_EMAIL}`);
} else {
    console.log(`✅ Password reset for: ${TARGET_EMAIL}`);
    console.log(`   New password: ${NEW_PASSWORD}`);
    console.log(`   Stored hash:  ${newHash}`);
}

await mongoose.connection.close();
console.log('\n✅ Done — delete this file now!');