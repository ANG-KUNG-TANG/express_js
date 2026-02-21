import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

export default async () => {
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  global.__MONGO_SERVER__ = mongoServer;
  global.__MONGO_URI__ = uri;
};

// ── JWT ───────────────────────────────────────────────────────────────────────
process.env.JWT_ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  ?? 'test-access-secret-32-chars-min!!';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-32-chars-min!';
process.env.JWT_ACCESS_EXPIRY  = process.env.JWT_ACCESS_EXPIRY  ?? '15m';
process.env.JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY ?? '7d';

// ── App / Node env ────────────────────────────────────────────────────────────
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test'