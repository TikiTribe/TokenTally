import { defineConfig } from '@playwright/test';

// Browser E2E scaffold (spec §5.9 C2, premortem D1/D3/D5). NOT part of the 0D CI gate: these verify the
// CURRENT chart-less/tiktoken build only, and the §13 "CSP verified enforced / zero egress" floor is
// declared ONLY after re-running against a Phase-2-representative build (worker + one chart + one export +
// the Transformers.js adapter). Run in a dedicated CI job that does `npm run build && npx playwright install
// chromium && npx playwright test`.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  fullyParallel: false,
  webServer: {
    command: 'node tests/e2e/serve-with-csp.mjs',
    port: 4173,
    reuseExistingServer: false,
    timeout: 30_000,
  },
  use: { baseURL: 'http://localhost:4173' },
});
