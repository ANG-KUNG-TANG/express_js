// src/tests/setup.js
import { MongoMemoryServer } from 'mongodb-memory-server';

export default async () => {
  const mongoServer = await MongoMemoryServer.create({
    binary: { version: '6.0.6' },
  });
  const uri = mongoServer.getUri();

  // ✅ global.* only lives in the globalSetup/globalTeardown host process.
  //    Test workers NEVER see it — hence the MongoParseError you got.
  //    process.env IS inherited by every child worker, so use that instead.
  global.__MONGO_SERVER__ = mongoServer;          // used by teardown.js (same host process ✓)
  process.env.__MONGO_URI__ = uri;               // ← THE FIX: readable in all test workers

  // JWT / app env vars — also fine here because they go into process.env
  process.env.JWT_ACCESS_SECRET  ??= 'test-access-secret-32-chars-min!!';
  process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-32-chars-min!';
  process.env.JWT_ACCESS_EXPIRY  ??= '15m';
  process.env.JWT_REFRESH_EXPIRY ??= '7d';
  process.env.NODE_ENV           ??= 'test';
};