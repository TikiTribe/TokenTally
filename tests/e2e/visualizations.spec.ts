// VISUALIZATION VALIDATION - each chart is now readable to sighted users (visible caption, labels, axis, and
// per-point hover) with a visually-hidden data table kept as a redundant screen-reader aid. We validate the
// TABLES (the values the chart encodes) + presence/absence per mode + the tornado ordering. Value-level math
// for the step table is covered in math.spec.ts (oracle E); here we assert structure, gating, and sort order.
import { test, expect } from '@playwright/test';
import { waitReady, selectMode, MODE_TABS } from './helpers';

const parseMoney = (s: string): number => Number((s.match(/\$([\d.,]+)/)?.[1] ?? '0').replace(/,/g, ''));

test.describe('visualizations', () => {
  test('cost waterfall renders the component breakdown for chatbot', async ({ page }) => {
    await waitReady(page);
    const wf = page.getByRole('group', { name: /monthly cost breakdown/i });
    await expect(wf).toBeVisible({ timeout: 8000 });
    // Default chatbot has an empty system prompt (prefix 0), so only the paid rows render; the zero-cost cache
    // rows are hidden (#16), not shown as "$0" noise.
    for (const label of ['input', 'output']) {
      await expect(page.getByTestId(`waterfall-${label}`)).toHaveCount(1);
    }
    for (const label of ['cacheWrite', 'cacheReads']) {
      await expect(page.getByTestId(`waterfall-${label}`)).toHaveCount(0);
    }
  });

  test('step-accumulation chart renders for agent (one row per step) but NOT for chatbot', async ({ page }) => {
    await waitReady(page);
    // chatbot: no per-step accumulation chart
    await expect(page.getByRole('group', { name: /cost per agent step/i })).toHaveCount(0);
    // agent: 6 rows (default stepsPerRun), columns Step / Input tokens / Output tokens / Cost
    await selectMode(page, MODE_TABS.agent);
    const step = page.getByRole('group', { name: /cost per agent step/i });
    const table = step.locator('table');
    await expect(table.locator('tbody tr')).toHaveCount(6);
    const head = (await table.locator('thead').textContent()) ?? '';
    expect(head).toContain('Step');
    expect(head).toContain('Input tokens');
    expect(head).toContain('Cost');
  });

  test('tornado chart lists the 4 chatbot factors, sorted by swing descending', async ({ page }) => {
    await waitReady(page);
    const tornado = page.getByRole('group', { name: /sensitivity/i });
    const table = tornado.locator('table');
    const bodyText = (await table.textContent()) ?? '';
    // The table renders human factor labels now, not raw engine ids (#5/#18).
    for (const f of ['Conversations / month', 'Avg response tokens', 'Context growth / turn', 'Turns / conversation']) {
      expect(bodyText).toContain(f);
    }
    // Swing is the last column; read each row's swing and assert non-increasing order.
    const rows = table.locator('tbody tr');
    const n = await rows.count();
    const swings: number[] = [];
    for (let i = 0; i < n; i++) {
      const cells = rows.nth(i).locator('td');
      swings.push(parseMoney((await cells.nth(3).textContent()) ?? '$0'));
    }
    expect(swings.length).toBe(4);
    for (let i = 1; i < swings.length; i++) expect(swings[i]).toBeLessThanOrEqual(swings[i - 1]);
  });

  test('tornado chart does NOT render for crew (sensitivity deferred)', async ({ page }) => {
    await waitReady(page);
    await selectMode(page, MODE_TABS.crew);
    await expect(page.getByRole('group', { name: /monthly cost breakdown/i })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('group', { name: /sensitivity/i })).toHaveCount(0);
  });
});
