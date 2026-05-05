// src/tests/helpers/mongoMemory.js
// Shared helper for model & repo integration tests.
// Each test suite calls createMongoMemory() and uses the returned
// start / stop functions in beforeAll / afterAll.
// This avoids the global.__MONGO_URI__ ESM cross-process problem.

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

/**
 * Returns { start, stop } hooks for use in beforeAll / afterAll.
 *
 * @example
 * import { createMongoMemory } from '../helpers/mongoMemory.js';
 * const mongo = createMongoMemory();
 * beforeAll(mongo.start);
 * afterAll(mongo.stop);
 */
export function createMongoMemory() {
  let mongod;

  async function start() {
    // Disconnect any leftover connection from a previous test run
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri(); // already ends with /  e.g. mongodb://127.0.0.1:PORT/
    await mongoose.connect(uri);
  }

  async function stop() {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
    if (mongod) {
      await mongod.stop();
    }
  }

  return { start, stop };
}