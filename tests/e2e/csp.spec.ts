import { test, expect } from '@playwright/test';

// D1/D3/secu#5: verifies the CURRENT build under the served vercel.json CSP. A hard timeout + a render
// assertion prevent a never-firing violation listener from passing vacuously. Re-run against a
// Phase-2-representative build (charts + worker + export) before declaring the §13 CSP floor.
test('serves the app with no securitypolicyviolation', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#root')).not.toBeEmpty(); // the app actually rendered (not a white screen)
  const v = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
  expect(v, `CSP violations: ${JSON.stringify(v)}`).toEqual([]);
});
