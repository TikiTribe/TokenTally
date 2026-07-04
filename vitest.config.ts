import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    // node by default (engine/scripts/logic); jsdom only for React component tests (P2-A8).
    environment: 'node',
    environmentMatchGlobs: [['**/*.test.tsx', 'jsdom']],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
});
