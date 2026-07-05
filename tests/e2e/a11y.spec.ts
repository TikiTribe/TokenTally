// P2 (2E): WCAG AA verification with a same-origin vendored axe (no CDN - CSP forbids it; @axe-core/playwright
// injects axe via the debugger, which bypasses the page CSP). Scans the shell + every mode in BOTH themes and
// fails on any serious/critical WCAG 2.0/2.1 A/AA violation, served under the real vercel.json CSP.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function seriousViolations(page: Page): Promise<{ id: string; impact: string | null | undefined }[]> {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, impact: v.impact }));
}

for (const theme of ['light', 'dark'] as const) {
  test(`a11y: landing + all calculator modes have no serious/critical WCAG violations (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => {
      if (t === 'dark') localStorage.setItem('tokentally-theme', 'dark');
    }, theme);
    // Zero transitions so axe reads the SETTLED UI, not a mid-transition frame (e.g. a tab colour briefly
    // interpolating white->muted just after deselection).
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // 1) the marketing landing (home view)
    await page.goto('/');
    await page.waitForSelector('.lp-hero', { timeout: 10000 });
    const lv = await seriousViolations(page);
    expect(lv, `${theme} / landing: ${JSON.stringify(lv)}`).toEqual([]);

    // 2) the calculator, every mode
    await page.goto('/#calculator');
    await expect(page.getByText(/Pricing data as of/)).toBeVisible({ timeout: 10000 });
    for (const mode of [/^Chatbot/, /^Prompt/, /^Agent$/, /^Multi-agent/, /^Denial of Wallet/]) {
      await page.getByRole('tab', { name: mode }).click();
      await page.waitForTimeout(200); // let the tab colour transition settle before axe reads it
      const v = await seriousViolations(page);
      expect(v, `${theme} / ${mode}: ${JSON.stringify(v)}`).toEqual([]);
    }
  });
}
