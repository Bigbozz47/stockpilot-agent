import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/math.test.ts', 'tests/api.test.ts', 'tests/agentTools.test.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    pool: 'forks',
    maxWorkers: 1,
    sequence: { shuffle: false },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
