import { test, expect } from '@playwright/test';

// D1/D3/secu#5 + P2-A16/2F: verifies the CURRENT build under the served vercel.json CSP. A hard render
// assertion prevents a never-firing violation listener from passing vacuously. The second test drives the
// Phase-2 code paths the §13 CSP floor actually depends on: the tokenizer WORKER (worker-src 'self', no
// blob:) and the engine/registry DYNAMIC IMPORTS (script-src 'self' on the lazy chunks).
async function armCspListener(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
}
const violations = (page: import('@playwright/test').Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);

test('serves the app with no securitypolicyviolation on load', async ({ page }) => {
  await armCspListener(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#root')).not.toBeEmpty();
  const v = await violations(page);
  expect(v, `CSP violations: ${JSON.stringify(v)}`).toEqual([]);
});

test('driving the worker + engine (type + mode switch) raises no CSP violation', async ({ page }) => {
  await armCspListener(page);
  await page.goto('/');
  // registry loads -> provenance stamp appears
  await expect(page.getByText(/Pricing data as of/)).toBeVisible({ timeout: 10000 });

  // Prompt mode: typing constructs the ES-module worker (worker-src 'self') and tokenizes off-thread.
  await page.getByRole('tab', { name: /^Prompt/ }).click();
  await page.getByLabel('Prompt', { exact: true }).fill('the quick brown fox jumps over the lazy dog');
  await expect(page.getByText(/\d+ tokens ·/)).toBeVisible({ timeout: 10000 });

  // Switch to Agent: exercises the engine dynamic import + a fresh forecast render.
  await page.getByRole('tab', { name: /^Agent$/ }).click();
  await expect(page.getByText(/\/ month/)).toBeVisible({ timeout: 10000 });

  const v = await violations(page);
  expect(v, `CSP violations: ${JSON.stringify(v)}`).toEqual([]);
});
