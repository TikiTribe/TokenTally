// LANDING + ROUTING — '/' is the marketing landing; the CTAs route into the calculator (#calculator); the
// brand link routes back; deep-links work. Complements the calculator specs (which enter at #calculator).
import { test, expect } from '@playwright/test';

test.describe('landing page', () => {
  test('renders the hero, workloads, features, and CTAs on the home route', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Know what your LLM feature costs/ })).toBeVisible();
    // hero product preview + stats
    await expect(page.locator('.lp-preview__money')).toHaveText('$143.75');
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

  test('theme toggle works on the landing', async ({ page }) => {
    await page.goto('/');
    const btn = page.getByRole('button', { name: /Theme:.*Activate to change/ });
    await btn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await btn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
