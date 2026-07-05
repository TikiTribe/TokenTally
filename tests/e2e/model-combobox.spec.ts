// Searchable model combobox: type to filter 2,300+ models, vendor group headers, keyboard select, and the
// newest models are reachable + price correctly.
import { test, expect } from '@playwright/test';
import { waitReady, headline } from './helpers';

test.describe('model combobox (search + groups)', () => {
  test('typing filters the list and vendor group headers show', async ({ page }) => {
    await waitReady(page);
    const input = page.getByLabel('Model', { exact: true });
    await input.click();
    await expect(page.getByRole('listbox', { name: 'Models' })).toBeVisible();
    // a broad query keeps the vendor group header visible
    await input.fill('opus');
    const list = page.getByRole('listbox', { name: 'Models' });
    await expect(list).toContainText('Anthropic'); // group header
    await expect(page.getByRole('option', { name: 'claude-opus-4-8 (anthropic)', exact: true })).toBeVisible();
  });

  test('selecting the newest Claude (Opus 4.8) reprices to the hand-checked value', async ({ page }) => {
    await waitReady(page);
    const input = page.getByLabel('Model', { exact: true });
    await input.click();
    await input.fill('claude-opus-4-8');
    await page.getByRole('option', { name: 'claude-opus-4-8 (anthropic)', exact: true }).first().click();
    // opus-4-8: input $5/M, output $25/M. Default chatbot: 50000*350*5/1e6 + 50000*200*25/1e6 = 87.5 + 250
    await expect(headline(page)).toContainText('$337.5', { timeout: 8000 });
  });

  test('Fable 5 is present (was missing from the old snapshot)', async ({ page }) => {
    await waitReady(page);
    const input = page.getByLabel('Model', { exact: true });
    await input.click();
    await input.fill('fable');
    await expect(page.getByRole('option', { name: 'claude-fable-5 (anthropic)', exact: true })).toBeVisible();
  });

  test('keyboard: type + Enter commits a selection (list closes, input shows the full label)', async ({ page }) => {
    await waitReady(page);
    const input = page.getByLabel('Model', { exact: true });
    await input.click();
    await input.fill('gpt-4o-mini'); // active = first result
    await input.press('Enter');
    // proves a selection happened (vs a no-op that would leave the list open with the raw query as the value):
    await expect(page.getByRole('listbox', { name: 'Models' })).toBeHidden();
    await expect(input).toHaveValue(/gpt-4o-mini.*\(.+\)/); // a "name (deployment)" label, not the bare query
  });

  test('a no-match query shows an honest empty state', async ({ page }) => {
    await waitReady(page);
    const input = page.getByLabel('Model', { exact: true });
    await input.click();
    await input.fill('zzz-not-a-real-model');
    await expect(page.getByText(/No models match/)).toBeVisible();
  });
});
