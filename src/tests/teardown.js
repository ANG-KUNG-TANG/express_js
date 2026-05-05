// src/tests/teardown.js
export default async () => {
  // ✅ global.__MONGO_SERVER__ IS accessible here because globalSetup and
  //    globalTeardown share the same host process (unlike test workers).
  if (global.__MONGO_SERVER__) {
    await global.__MONGO_SERVER__.stop();
  }

  // ❌ Do NOT call mongoose.disconnect() here.
  //    This host process was never connected to Mongo — each test worker
  //    manages its own connection. Calling disconnect() here either throws
  //    or silently does nothing, and can delay teardown.
};