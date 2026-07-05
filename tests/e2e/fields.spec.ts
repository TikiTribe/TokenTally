// FIELD VALIDATION - every field with hostile/edge inputs (0, negative, empty, huge). Asserts the documented
// clamps hold, nothing renders NaN/Infinity/negative, and the "never a silent $0" invariant: a real per-token
// forecast may legitimately show $0 for zero volume, but disabled/unmodeled states show an honest note instead.
import { test, expect } from '@playwright/test';
import { waitReady, selectMode, setField, MODE_TABS, headline, headlineValue } from './helpers';

const MONEY = /^\$[\d.,]+\s*\/ month$/; // finite positive "$X / month", never "NaN"/"Infinity"/"-$"

test.describe('field validation & clamps', () => {
  test('zero volume yields a legitimate $0 headline (correct, not a silent-$0 bug)', async ({ page }) => {
    await waitReady(page);
    await setField(page, 'Conversations per month', 0);
    await expect(headline(page)).toHaveText(/\$0\s*\/ month/, { timeout: 8000 });
    expect(await headlineValue(page)).toBe(0);
  });

  test('negative token counts never produce a negative or NaN cost', async ({ page }) => {
    await waitReady(page);
    await setField(page, 'Avg response (tokens)', -100000);
    await setField(page, 'Avg user message (tokens)', -50);
    await expect(headline(page)).toHaveText(MONEY, { timeout: 8000 });
    expect(await headlineValue(page)).toBeGreaterThanOrEqual(0);
  });

  test('empty field coerces to 0 without crashing the forecast', async ({ page }) => {
    await waitReady(page);
    await setField(page, 'Conversations per month', ''); // Number('') === 0
    await expect(headline(page)).toHaveText(/\$0\s*\/ month/, { timeout: 8000 });
  });

  test('astronomically large volume stays finite (bounded clamp, no Infinity)', async ({ page }) => {
    await waitReady(page);
    await setField(page, 'Conversations per month', '1e20');
    await expect(headline(page)).toHaveText(MONEY, { timeout: 8000 });
    const v = await headlineValue(page);
    expect(Number.isFinite(v)).toBe(true);
  });

  test('crew member count clamps to 64 (1000 members prices identically to 64)', async ({ page }) => {
    await waitReady(page);
    await selectMode(page, MODE_TABS.crew);
    await setField(page, 'Number of agents', 64);
    await expect(headline(page)).toHaveText(MONEY, { timeout: 8000 });
    const at64 = await headlineValue(page);
    await setField(page, 'Number of agents', 1000);
    await expect(headline(page)).toHaveText(MONEY, { timeout: 8000 });
    // proves the upstream clamp: 1000 members must price exactly like 64 (excess is dropped, not modelled)
    expect(await headlineValue(page)).toBeCloseTo(at64, 2);
  });

  test('crew member count of 0 / negative clamps up to 1 (still a valid forecast)', async ({ page }) => {
    await waitReady(page);
    await selectMode(page, MODE_TABS.crew);
    await setField(page, 'Number of agents', 0);
    await expect(headline(page)).toHaveText(MONEY, { timeout: 8000 });
    expect(await headlineValue(page)).toBeGreaterThan(0); // 1 member still costs money
  });

  test('DoW retry ceiling below 1 clamps to 1; doubling it doubles exposure', async ({ page }) => {
    await waitReady(page);
    await selectMode(page, MODE_TABS.dow);
    await page.getByLabel(/Enable Denial-of-Wallet/).check();
    await page.getByLabel(/authorized to test/).check();
    const exposure = page.getByTestId('dow-exposure');
    await expect(exposure).toContainText('$483,840', { timeout: 8000 }); // retryCeiling default 1
    await setField(page, 'Retry ceiling (forced-retry multiplier)', 0); // clamps to 1
    await expect(exposure).toContainText('$483,840', { timeout: 8000 }); // unchanged, not $0
    await setField(page, 'Retry ceiling (forced-retry multiplier)', 2);
    await expect(exposure).toContainText('$967,680', { timeout: 8000 }); // exactly 2x
  });

  test('DoW huge attacker volume stays finite (bounded, no NaN/Infinity exposure)', async ({ page }) => {
    await waitReady(page);
    await selectMode(page, MODE_TABS.dow);
    await page.getByLabel(/Enable Denial-of-Wallet/).check();
    await page.getByLabel(/authorized to test/).check();
    await setField(page, 'Attacker requests per month', '1e20');
    const exposure = page.getByTestId('dow-exposure');
    await expect(exposure).toContainText(/Worst-case exposure: \$[\d,]+/, { timeout: 8000 });
    await expect(exposure).not.toContainText(/NaN|Infinity/);
  });
});
