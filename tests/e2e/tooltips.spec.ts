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
// what it is and why". Every result summary line carries a HelpTip; every chart element carries a VISIBLE
// interactive tooltip (ChartTip / recharts Tooltip), not an invisible native title.
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

  test('every waterfall row shows a VISIBLE what+why tooltip on hover', async ({ page }) => {
    await waitReady(page);
    await selectMode(page, MODE_TABS.chatbot);
    await page.getByLabel('System prompt').fill('You are a helpful assistant.'); // force a cached prefix so cache rows show
    // wait out the tokenize + recompute debounce: the cache-write row appearing proves the waterfall re-rendered
    await expect(page.getByTestId('waterfall-cacheWrite')).toBeVisible({ timeout: 8000 });
    const outputRow = page.locator('figure[aria-label="Monthly cost breakdown"] li', { has: page.getByTestId('waterfall-output') });
    await outputRow.hover();
    // The real fix: a styled role=tooltip becomes visible on hover, not an invisible native `title`.
    await expect(outputRow.locator('.chart-tip')).toHaveClass(/is-open/);
    await expect(outputRow.locator('.chart-tip')).toContainText(/Output:.*output rate/i);
    const rows = page.locator('figure[aria-label="Monthly cost breakdown"] li');
    const n = await rows.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      await expect(rows.nth(i).locator('.chart-tip')).toContainText(/.+:.+/); // "<Label>: <what and why>"
    }
  });

  test('every tornado row shows a VISIBLE tooltip naming the swing on hover', async ({ page }) => {
    await waitReady(page);
    const rows = page.locator('.tornado__row');
    await expect(rows.first()).toBeVisible({ timeout: 8000 });
    await rows.first().hover();
    await expect(rows.first().locator('.chart-tip')).toHaveClass(/is-open/); // the user-reported failure now passes
    const n = await rows.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      await expect(rows.nth(i).locator('.chart-tip')).toContainText(/swing is how much this one input moves the total/i);
    }
  });

  test('the agent step line shows a step tooltip on hover ANYWHERE over the plot', async ({ page }) => {
    await waitReady(page);
    await selectMode(page, MODE_TABS.agent);
    const chart = page.locator('figure[aria-label*="agent step"]');
    await expect(chart).toBeVisible({ timeout: 8000 });
    await chart.scrollIntoViewIfNeeded();
    const svg = chart.locator('svg.recharts-surface').first();
    await expect(svg).toBeVisible({ timeout: 8000 });
    const box = await svg.boundingBox();
    if (!box) throw new Error('no chart svg');
    // recharts activates its tooltip on mousemove and shows the NEAREST step for the cursor's x - no need to land
    // on a 3px dot (the "hover a point on the line shows nothing" fix). Re-move the mouse each poll (alternating x
    // so recharts recomputes the active point) until the tooltip has content.
    let flip = 0;
    await expect
      .poll(
        async () => {
          flip ^= 1;
          await page.mouse.move(box.x + box.width * (0.4 + flip * 0.2), box.y + box.height * 0.5);
          return (await chart.locator('.recharts-tooltip-wrapper').textContent()) ?? '';
        },
        { timeout: 6000, intervals: [150, 250, 400] },
      )
      .toMatch(/Step \d+/);
  });
});
