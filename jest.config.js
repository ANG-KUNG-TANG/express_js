export default {
  testEnvironment: "node",
  transform: {},
  injectGlobals: true,
  globalSetup: './src/tests/setup.js',
  globalTeardown:"./src/tests/teardown.js"
};
