// HELP / TOOLTIP behavior — the instructions layer is user-facing, so it is tested too: field tooltips open
// on focus + hover, expose their content, dismiss on ESC (WCAG 1.4.13), and the per-mode explainer expands.
import { test, expect } from '@playwright/test';
import { waitReady, selectMode, MODE_TABS } from './helpers';

test.describe('help & tooltips', () => {
  test('field tooltip opens on focus, exposes its content, and dismisses on ESC', async ({ page }) => {
    await waitReady(page);
    const row = page.locator('.field-label-row', { hasText: 'Avg response (tokens)' });
    const btn = row.getByRole('button', { name: 'More information' });
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await btn.focus();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    // the tooltip content becomes the visible bubble
    await expect(row.getByRole('tooltip')).toBeVisible();
    await expect(row.getByRole('tooltip')).toContainText(/Output tokens cost/);
    await page.keyboard.press('Escape');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  test('field tooltip also opens on hover (not focus-only)', async ({ page }) => {
    await waitReady(page);
    const row = page.locator('.field-label-row', { hasText: 'Conversations per month' });
    await row.getByRole('button', { name: 'More information' }).hover();
    await expect(row.getByRole('tooltip')).toBeVisible();
    await expect(row.getByRole('tooltip')).toContainText(/top sensitivity factor/);
  });

  test('every input field in each mode has an associated help tooltip', async ({ page }) => {
    await waitReady(page);
    for (const [mode, expected] of [
      [MODE_TABS.chatbot, 6], // model + system prompt + 4 numbers + context strategy = 7 tips (see note)
      [MODE_TABS.agent, 6],
      [MODE_TABS.crew, 4],
    ] as const) {
      await selectMode(page, mode);
      await expect(page.getByRole('tooltip')).not.toHaveCount(0);
      // at least `expected` help buttons present (model + fields)
      expect(await page.getByRole('button', { name: 'More information' }).count()).toBeGreaterThanOrEqual(expected);
    }
  });

  test('the per-mode "how this works" explainer expands and collapses', async ({ page }) => {
    await waitReady(page);
    const summary = page.getByText('How chatbot cost is modeled');
    await expect(summary).toBeVisible();
    const body = page.getByText(/main savings lever/);
    await expect(body).toBeHidden(); // collapsed by default
    await summary.click();
    await expect(body).toBeVisible();
  });
});
