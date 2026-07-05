// TOKEN STREAM - the collapsible per-token visualizer under the tokenized text boxes. Validates it reveals a
// live stream with a working hover readout, and - the security-critical case - that a token containing markup
// renders as inert text (no script execution) under the served CSP.
import { test, expect } from '@playwright/test';
import { waitReady, selectMode, MODE_TABS } from './helpers';

test.describe('token stream', () => {
  test('reveals a live per-token stream with a working hover readout', async ({ page }) => {
    await waitReady(page);
    await selectMode(page, MODE_TABS.chatbot);
    await page.getByLabel('System prompt').fill('The quick brown fox jumps');
    const details = page.locator('details.tokenstream').first();
    await details.locator('summary').click();
    const toks = details.locator('.tok:not(.tok--more)');
    await expect(toks.first()).toBeVisible({ timeout: 8000 });
    expect(await toks.count()).toBeGreaterThan(3);
    await expect(details.locator('.tokenstream__summary')).toContainText(/\d+ tokens/);
    // hover a token -> the single shared readout reports it
    await toks.nth(1).hover();
    await expect(details.locator('.tokenstream__readout')).toContainText(/token \d+ of \d+/);
  });

  test('renders a token containing markup as INERT text, never executing it', async ({ page }) => {
    let dialogFired = false;
    page.on('dialog', (d) => {
      dialogFired = true;
      void d.dismiss();
    });
    await waitReady(page);
    await selectMode(page, MODE_TABS.chatbot);
    await page.getByLabel('System prompt').fill('<script>alert(1)</script>hello');
    const details = page.locator('details.tokenstream').first();
    await details.locator('summary').click();
    await expect(details.locator('.tok').first()).toBeVisible({ timeout: 8000 });
    // the markup shows as visible text, and there is NO real <script>/<img> element inside the stream
    await expect(details.locator('.tokenstream__stream')).toContainText('<script>');
    expect(await details.locator('script, img').count()).toBe(0);
    expect(dialogFired).toBe(false);
  });
});
