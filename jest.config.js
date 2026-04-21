// jest.config.js  — place in project root, replaces existing config
export default {
    testEnvironment: 'node',
    transform:       {},
    injectGlobals:   true,
    globalSetup:     './src/tests/setup.js',
    globalTeardown:  './src/tests/teardown.js',
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