// jest.config.js  — place in project root
export default {
    testEnvironment: 'node',
    transform:       {},
    injectGlobals:   true,
    globalSetup:     './src/tests/setup.js',
    globalTeardown:  './src/tests/teardown.js',
    // NOTE: 'globalSetupTimeout' is NOT a valid Jest option (causes a warning).
    // Use 'testTimeout' to extend the per-test timeout, or pass --testTimeout
    // on the CLI. The MongoMemoryServer download is handled in globalSetup;
    // Jest does not expose a dedicated timeout for that phase via config.
    testTimeout: 120000,   // 2 minutes — covers slow CI / first-run binary download
    testMatch: [
        '**/src/tests/**/*.test.js',
    ],
    collectCoverageFrom: [
        'src/app/**/*.js',
        '!src/app/validators/**',
    ],
};

// ─── Add these scripts to package.json ───────────────────────────────────────
// "test":          "node --experimental-vm-modules node_modules/.bin/jest"
// "test:admin":    "node --experimental-vm-modules node_modules/.bin/jest src/tests/application/admin"
// "test:coverage": "node --experimental-vm-modules node_modules/.bin/jest --coverage"