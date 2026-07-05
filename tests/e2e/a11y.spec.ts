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

// Under CPU contention (the full parallel suite) getComputedStyle can return a heading's inherited var(--text)
// color from BEFORE the theme's style recalc has propagated down the cascade - a stale frame axe reads as a
// dark-on-dark contrast failure even though the painted UI is correct. Wait until the section-heading colors
// stop changing across consecutive samples (the cascade has settled) before letting axe scan. No assumption
// about the "correct" color, so it works for the themed heads, the white CTA head, and the gradient title.
async function waitThemeSettled(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const w = window as unknown as { __a11yColors?: string };
      const cur = Array.from(document.querySelectorAll('.lp-h2, .lp-title'))
        .map((h) => getComputedStyle(h as HTMLElement).color)
        .join('|');
      const stable = cur.length > 0 && w.__a11yColors === cur;
      w.__a11yColors = cur;
      return stable;
    },
    undefined,
    { timeout: 8000, polling: 250 },
  );
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
    await waitThemeSettled(page); // let the themed heading colors settle so axe reads the real UI, not a recalc frame
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

    // 3) the OPEN model combobox — the interactive listbox (options, group headers) and the no-match state,
    // which the settled-UI scan above cannot see (the picker is collapsed at rest).
    await page.getByRole('tab', { name: /^Chatbot/ }).click();
    const model = page.getByLabel('Model', { exact: true });
    await model.click();
    await model.fill('claude');
    await page.waitForTimeout(200);
    const openV = await seriousViolations(page);
    expect(openV, `${theme} / combobox open: ${JSON.stringify(openV)}`).toEqual([]);
    await model.fill('zzz-not-a-real-model'); // no-match: must not leave an option-less listbox
    await page.waitForTimeout(200);
    const emptyV = await seriousViolations(page);
    expect(emptyV, `${theme} / combobox no-match: ${JSON.stringify(emptyV)}`).toEqual([]);
  });
}
