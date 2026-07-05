// LANDING / INTRO — the top-of-page explainer that tells a first-time visitor what TokenTally is and how to
// use it, and can be collapsed (persisted) by returning users.
import { test, expect } from '@playwright/test';
import { waitReady } from './helpers';

test.describe('intro / landing', () => {
  test('explains what TokenTally is and how to use it on first load', async ({ page }) => {
    await waitReady(page);
    const intro = page.getByRole('region', { name: /About TokenTally|Forecast what your LLM feature/i })
      .or(page.locator('section.intro'));
    await expect(page.getByRole('heading', { name: /Forecast what your LLM feature will cost/ })).toBeVisible();
    await expect(page.getByText(/across 1,300\+ models/)).toBeVisible();
    await expect(page.getByText('How to use it')).toBeVisible();
    // the 5 workloads are described
    for (const w of ['Chatbot', 'Prompt / Batch', 'Agent', 'Multi-agent', 'Denial of Wallet']) {
      await expect(page.locator('.intro__workloads')).toContainText(w);
    }
    await expect(intro.first()).toBeVisible();
  });

  test('can be hidden and re-shown, and the choice persists across reloads', async ({ page }) => {
    await waitReady(page);
    await page.getByRole('button', { name: 'Hide the intro' }).click();
    // collapses to a slim re-open bar
    await expect(page.getByRole('heading', { name: /Forecast what your LLM feature/ })).toHaveCount(0);
    const reopen = page.getByRole('button', { name: 'What is TokenTally?' });
    await expect(reopen).toBeVisible();
    // persists across reload
    await page.reload();
    await expect(page.getByText(/Pricing data as of/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'What is TokenTally?' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Forecast what your LLM feature/ })).toHaveCount(0);
    // re-show
    await page.getByRole('button', { name: 'What is TokenTally?' }).click();
    await expect(page.getByRole('heading', { name: /Forecast what your LLM feature will cost/ })).toBeVisible();
  });

  test('the calculator still works with the intro present (tab + forecast)', async ({ page }) => {
    await waitReady(page);
    await expect(page.getByRole('tab', { name: /^Chatbot$/ })).toBeVisible();
    await expect(page.getByTestId('headline-cost')).toContainText('/ month', { timeout: 8000 });
  });
});
