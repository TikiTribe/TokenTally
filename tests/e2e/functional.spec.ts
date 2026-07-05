// Phase 4: headed functional acceptance - drives EVERY user-facing function in a real browser under the
// served CSP. Complements the CSP/egress/a11y specs (which assert no violations); this asserts the features
// actually work end to end.
import { test, expect, type Page } from '@playwright/test';

async function waitReady(page: Page): Promise<void> {
  await page.goto('/#calculator'); // '/' is now the marketing landing
  await expect(page.getByText(/Pricing data as of/)).toBeVisible({ timeout: 10000 });
}

test('every mode produces a forecast or an honest note (never a blank/$0)', async ({ page }) => {
  await waitReady(page);
  const forecast = page.getByRole('heading', { name: /Cost forecast/ });
  await expect(forecast).toBeVisible();
  for (const mode of [/^Chatbot/, /^Prompt/, /^Agent$/, /^Multi-agent/]) {
    await page.getByRole('tab', { name: mode }).click();
    // a $/month headline appears for a resolvable model + non-empty inputs
    await expect(page.getByTestId('headline-cost')).toContainText('/ month', { timeout: 8000 });
  }
});

test('typing tokenizes off the main thread (live token count)', async ({ page }) => {
  await waitReady(page);
  await page.getByRole('tab', { name: /^Prompt/ }).click();
  await page.getByLabel('Prompt', { exact: true }).fill('the quick brown fox jumps over the lazy dog');
  await expect(page.getByText(/\d+ tokens ·/)).toBeVisible({ timeout: 8000 });
});

test('CSV export downloads', async ({ page }) => {
  await waitReady(page);
  await expect(page.getByTestId('headline-cost')).toContainText('/ month', { timeout: 8000 });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export CSV/ }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
});

test('PDF export downloads (lazy jsPDF loads under CSP)', async ({ page }) => {
  await waitReady(page);
  await expect(page.getByTestId('headline-cost')).toContainText('/ month', { timeout: 8000 });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export PDF/ }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
});

test('permalink round-trips config (and never carries prompt text)', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await waitReady(page);
  await page.getByRole('tab', { name: /^Chatbot/ }).click();
  await page.getByLabel('System prompt').fill('SECRET INTERNAL PROMPT');
  await page.getByLabel('Conversations per month').fill('777777');
  await page.getByRole('button', { name: /Copy shareable link/ }).click();
  const url = page.url();
  expect(url).toMatch(/#c=/);
  expect(decodeURIComponent(url)).not.toContain('SECRET'); // prompt text is never encoded

  // reload with the permalink -> the numeric config is restored
  await page.goto(url);
  await expect(page.getByText(/Pricing data as of/)).toBeVisible({ timeout: 10000 });
  await expect(page.getByLabel('Conversations per month')).toHaveValue('777777');
});

test('example scenario chip loads and switches mode', async ({ page }) => {
  await waitReady(page);
  await page.getByRole('button', { name: /LangChain tool agent/ }).click();
  // the LangChain example is an Agent scenario -> the Agent tab becomes selected
  await expect(page.getByRole('tab', { name: /^Agent$/ })).toHaveAttribute('aria-selected', 'true');
});

test('theme toggle cycles system -> light -> dark', async ({ page }) => {
  await waitReady(page);
  const btn = page.getByRole('button', { name: /^Theme:/ });
  await expect(btn).toContainText(/System/);
  await btn.click();
  await expect(btn).toContainText(/Light/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await btn.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('Denial of Wallet is double-gated: no figure until both checkboxes', async ({ page }) => {
  await waitReady(page);
  await page.getByRole('tab', { name: /Denial of Wallet/ }).click();
  // the defensive disclaimer + VDP link show; no exposure figure yet
  await expect(page.getByText(/Defensive planning only/)).toBeVisible();
  await expect(page.getByText(/Worst-case exposure/)).toHaveCount(0);
  // enable both gates -> a figure appears (disclaimer still shown, DOM-before it)
  await page.getByLabel(/Enable Denial-of-Wallet/).check();
  await page.getByLabel(/authorized to test/).check();
  await expect(page.getByText(/Worst-case exposure/)).toBeVisible({ timeout: 8000 });
});
