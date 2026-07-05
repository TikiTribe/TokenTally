// LANDING + ROUTING — '/' is the marketing landing; the CTAs route into the calculator (#calculator); the
// brand link routes back; deep-links work. Complements the calculator specs (which enter at #calculator).
import { test, expect } from '@playwright/test';

test.describe('landing page', () => {
  test('renders the hero, workloads, features, and CTAs on the home route', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Know what your LLM feature costs/ })).toBeVisible();
    // hero product preview (decorative mock) + stats render — assert structure, not the mock's literal value
    await expect(page.locator('.lp-preview__money')).toBeVisible();
    await expect(page.locator('.lp-stat')).toHaveCount(4);
    // 5 workload cards + 6 feature cards
    await expect(page.locator('#workloads .lp-card')).toHaveCount(5);
    await expect(page.locator('#features .lp-card')).toHaveCount(6);
    // the calculator is NOT mounted yet (no tablist on the landing)
    await expect(page.getByRole('tablist', { name: /calculator mode/i })).toHaveCount(0);
  });

  test('the hero "Start calculating" CTA launches the calculator', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Start calculating/ }).first().click();
    await expect(page.getByRole('tablist', { name: /calculator mode/i })).toBeVisible();
    await expect(page.getByText(/Pricing data as of/)).toBeVisible({ timeout: 15000 });
    expect(page.url()).toContain('#calculator');
  });

  test('the nav "Launch calculator" button launches the calculator', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Launch calculator' }).click();
    await expect(page.getByRole('tablist', { name: /calculator mode/i })).toBeVisible();
  });

  test('the brand link returns from the calculator to the landing', async ({ page }) => {
    await page.goto('/#calculator');
    await expect(page.getByText(/Pricing data as of/)).toBeVisible({ timeout: 15000 });
    await page.getByRole('link', { name: /TokenTally/ }).click();
    await expect(page.getByRole('heading', { name: /Know what your LLM feature costs/ })).toBeVisible();
  });

  test('deep-linking #calculator lands directly on the calculator', async ({ page }) => {
    await page.goto('/#calculator');
    await expect(page.getByRole('tablist', { name: /calculator mode/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Know what your LLM feature costs/ })).toHaveCount(0);
  });

  test('dark-mode gradient headline/stat text meets AA contrast (axe is blind to clipped text)', async ({ page }) => {
    // axe reports background-clip:text elements as "incomplete", so the a11y suite cannot catch a contrast
    // regression on .lp-grad / .lp-stat__v. Guard it explicitly: the darker gradient stop (--brand) vs --bg.
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript(() => localStorage.setItem('tokentally-theme', 'dark'));
    await page.goto('/');
    await page.waitForSelector('.lp-hero');
    const ratio = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const hex = (h: string): number[] => { const s = h.trim().replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
      const lum = ([r, g, b]: number[]): number => { const f = (v: number): number => { const n = v / 255; return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const l1 = lum(hex(cs.getPropertyValue('--brand'))); // darker gradient stop
      const l2 = lum(hex(cs.getPropertyValue('--bg')));
      const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
      return (hi + 0.05) / (lo + 0.05);
    });
    expect(ratio).toBeGreaterThanOrEqual(3); // WCAG AA large/bold text
  });

  test('theme toggle works on the landing', async ({ page }) => {
    await page.goto('/');
    const btn = page.getByRole('button', { name: /Theme:.*Activate to change/ });
    await btn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await btn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
