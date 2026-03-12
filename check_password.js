import mongoose from 'mongoose';
import 'dotenv/config';

const MONGO_URI = process.env.MONGO_URI
    || process.env.DATABASE_URL
    || process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.error('❌ No MONGO_URI found in .env');
    process.exit(1);
}

await mongoose.connect(MONGO_URI);
console.log('✅ Connected to DB\n');

const doc = await mongoose.connection.collection('users')
    .findOne({ email: 'johndev@gmail.com' });

if (!doc) {
    console.log('❌ No user found with that email');
} else {
    console.log('=== USER DOCUMENT ===');
    console.log('email:   ', doc.email);
    console.log('name:    ', doc.name);
    console.log('role:    ', doc.role);
    console.log('password:', doc.password);
    console.log('=====================');
}

await mongoose.connection.close();
console.log('\n✅ Done — delete this file now!');