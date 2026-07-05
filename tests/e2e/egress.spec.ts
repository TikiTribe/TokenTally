import { test, expect } from '@playwright/test';

// D5: assert ZERO cross-origin network egress, monitored at the BrowserContext level so worker traffic is
// visible. Re-run with the Transformers.js adapter registered + a model tokenized (the only path that can
// fetch) at Phase 2 before declaring "tokenization makes zero network calls".
test('no cross-origin network egress on load', async ({ page, context, baseURL }) => {
  const offOrigin: string[] = [];
  const base = new URL(baseURL ?? 'http://localhost:4173');
  context.on('request', (req) => {
    const u = new URL(req.url());
    if (u.origin !== base.origin && u.protocol !== 'data:' && u.protocol !== 'blob:') offOrigin.push(req.url());
  });
  await page.goto('/#calculator'); // the calculator view loads the registry + worker (the real egress surface)
  await expect(page.getByText(/Pricing data as of/)).toBeVisible({ timeout: 15000 });
  await page.waitForLoadState('networkidle');
  expect(offOrigin, `off-origin requests: ${JSON.stringify(offOrigin)}`).toEqual([]);
});
