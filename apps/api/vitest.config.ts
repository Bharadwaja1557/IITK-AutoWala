import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // Each file starts its own in-memory mongod, so running them at the same
    // time means several servers and several ports for no benefit.
    fileParallelism: false,
    // The first run on a machine downloads a mongod binary.
    hookTimeout: 180_000,
    testTimeout: 30_000,
    /**
     * Test configuration, not secrets. MONGODB_URI is required by the env
     * schema but unused here: tests connect to the in-memory server started in
     * setup.ts. DEMO_MODE is off so the rider route never re-seeds underneath
     * an assertion about which drivers are live.
     */
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/iitk-autowala-test-unused',
      JWT_SECRET: 'test-signing-secret-that-is-long-enough-to-pass',
      JWT_EXPIRES_IN: '1h',
      BCRYPT_ROUNDS: '4',
      AVAILABILITY_TTL_MINUTES: '45',
      DEFAULT_SEARCH_RADIUS_METERS: '5000',
      MAX_NEARBY_RESULTS: '20',
      DEMO_MODE: 'false',
    },
  },
});
