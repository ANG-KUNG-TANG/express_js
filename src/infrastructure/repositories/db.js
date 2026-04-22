// infrastructure/repositories/db.js

import mongoose from 'mongoose';

// ── Connection options ────────────────────────────────────────────────────────
// serverSelectionTimeoutMS: how long to wait for Atlas to respond on cold start
// socketTimeoutMS:          how long to wait for a query response
// maxPoolSize:              max concurrent connections (default 5 is fine for hobby)

const MONGOOSE_OPTIONS = {
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS:          45_000,
    maxPoolSize:              10,
};

// ── Connect ───────────────────────────────────────────────────────────────────

export const connectDB = async () => {
    const uri = process.env.MONGO_URI;

    if (!uri) {
        console.error('❌ MONGO_URI is not set — check your Railway Variables tab');
        process.exit(1);
    }

    try {
        await mongoose.connect(uri, MONGOOSE_OPTIONS);
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }

    // ── Connection event listeners ────────────────────────────────────────────
    mongoose.connection.on('disconnected', () =>
        console.warn('[mongodb] Disconnected — Mongoose will auto-reconnect')
    );
    mongoose.connection.on('reconnected', () =>
        console.log('[mongodb] Reconnected')
    );
    mongoose.connection.on('error', (err) =>
        console.error('[mongodb] Connection error:', err.message)
    );
};

// ── Graceful shutdown ─────────────────────────────────────────────────────────

export const disconnectDB = async () => {
    await mongoose.connection.close();
    console.log('[mongodb] Connection closed');
};