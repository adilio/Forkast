import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['rules/**/*.test.ts'],
    globals: true,
    hookTimeout: 15_000,
    testTimeout: 10_000,
  },
});
