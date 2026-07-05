// HELP / TOOLTIP behavior - the instructions layer is user-facing, so it is tested too: field tooltips open
// on focus + hover, expose their content, dismiss on ESC (WCAG 1.4.13), and the per-mode explainer expands.
import { test, expect } from '@playwright/test';
import { waitReady, selectMode, MODE_TABS } from './helpers';

test.describe('help & tooltips', () => {
  // NOTE: the closed bubble is sr-only (1x1 clip), so Playwright's bounding-box toBeVisible() reports it
  // "visible" even when closed. The REAL open signal is aria-expanded on the button + the is-open class on the
  // bubble - assert those so a broken open path actually fails the test.
  test('field tooltip opens on focus, exposes its content, and dismisses on ESC', async ({ page }) => {
    await waitReady(page);
    const row = page.locator('.field-label-row', { hasText: 'Avg response (tokens)' });
    const btn = row.getByRole('button', { name: 'More information' });
    const tip = row.getByRole('tooltip');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(tip).not.toHaveClass(/is-open/);
    await btn.focus();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(tip).toHaveClass(/is-open/);
    await expect(tip).toContainText(/Output tokens cost/);
    await page.keyboard.press('Escape');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(tip).not.toHaveClass(/is-open/);
  });

  test('field tooltip also opens on hover (not focus-only)', async ({ page }) => {
    await waitReady(page);
    const row = page.locator('.field-label-row', { hasText: 'Conversations per month' });
    const btn = row.getByRole('button', { name: 'More information' });
    const tip = row.getByRole('tooltip');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await btn.hover();
    await expect(btn).toHaveAttribute('aria-expanded', 'true'); // the real open signal, not sr-only visibility
    await expect(tip).toHaveClass(/is-open/);
    await expect(tip).toContainText(/top sensitivity factor/);
  });

  test('clicking the help button does not close a hover-opened tooltip (no click/focus race)', async ({ page }) => {
    await waitReady(page);
    const row = page.locator('.field-label-row', { hasText: 'Turns per conversation' });
    const btn = row.getByRole('button', { name: 'More information' });
    await btn.click(); // click focuses -> opens; must NOT toggle back closed
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(row.getByRole('tooltip')).toHaveClass(/is-open/);
  });

  test('every input field in each mode has an associated help tooltip (exact count)', async ({ page }) => {
    await waitReady(page);
    for (const [mode, count] of [
      [MODE_TABS.chatbot, 7], // Model + system prompt + 4 numbers + context strategy
      [MODE_TABS.agent, 7],   // Model + preset + 5 numbers
      [MODE_TABS.crew, 5],    // Model + 4 numbers
    ] as const) {
      await selectMode(page, mode);
      // Scope to the field rows: the result surface now carries its own explanatory HelpTips (confidence, cache,
      // DoW), so an unscoped page-wide count would race the forecast render and drift. This asserts the intent:
      // every INPUT field has a help tooltip.
      await expect(page.locator('.field-label-row').getByRole('button', { name: 'More information' })).toHaveCount(count);
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

// The original ask: "hover over any item in a chart or graph, or any point on a line, and get an explanation of
// what it is and why". Every result summary line carries a HelpTip; every chart element carries a hover title.
test.describe('result & chart hover-explain', () => {
  test('the confidence line explains warm cache / point estimate on focus', async ({ page }) => {
    await waitReady(page);
    const line = page.getByTestId('confidence-line');
    await expect(line).toBeVisible({ timeout: 8000 });
    const btn = line.getByRole('button', { name: 'More information' });
    const tip = line.getByRole('tooltip');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await btn.focus();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(tip).toHaveClass(/is-open/);
    await expect(tip).toContainText(/point estimate|warm cache/i);
    await page.keyboard.press('Escape');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  test('every waterfall row has a what+why hover title', async ({ page }) => {
    await waitReady(page);
    await selectMode(page, MODE_TABS.chatbot);
    await page.getByLabel('System prompt').fill('You are a helpful assistant.'); // force a cached prefix so cache rows show
    // wait out the tokenize + recompute debounce: the cache-write row appearing proves the waterfall re-rendered
    await expect(page.getByTestId('waterfall-cacheWrite')).toBeVisible({ timeout: 8000 });
    const rows = page.locator('figure[aria-label="Monthly cost breakdown"] li');
    const n = await rows.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      await expect(rows.nth(i)).toHaveAttribute('title', /.+:.+/); // "<Label>: <what and why>"
    }
    // spot-check the meaning, not just presence
    await expect(page.locator('li', { has: page.getByTestId('waterfall-output') }))
      .toHaveAttribute('title', /Output:.*output rate/i);
  });

  test('every tornado row hover title names the swing and why it matters', async ({ page }) => {
    await waitReady(page);
    const rows = page.locator('.tornado__row');
    await expect(rows.first()).toBeVisible({ timeout: 8000 });
    const n = await rows.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      await expect(rows.nth(i)).toHaveAttribute('title', /swing is how much this one input moves the total/i);
    }
  });

  test('each agent step point carries a per-point hover title', async ({ page }) => {
    await waitReady(page);
    await selectMode(page, MODE_TABS.agent);
    const circles = page.locator('figure[aria-label*="agent step"] circle');
    await expect(circles.first()).toBeAttached({ timeout: 8000 });
    const n = await circles.count();
    expect(n).toBeGreaterThan(1);
    for (let i = 0; i < n; i++) {
      await expect(circles.nth(i).locator('title')).toContainText(/Step \d+:/);
    }
  });
});
