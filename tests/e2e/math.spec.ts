// COMPREHENSIVE MATH VALIDATION - drive known configs through the real UI and assert the rendered dollar
// figures equal INDEPENDENTLY HAND-COMPUTED values (arithmetic shown per test). This is what the smoke suite
// lacked: it proves the shipped pipeline (inputs -> tokenizer -> engine -> render) is numerically correct,
// not merely that "a number appeared". Reference pricing (registry snapshot):
//   gpt-4o/openai:      input $2.5/M, output $10/M, cache read $1.25/M (automatic, no write field ->
//                       cold-prefix rate falls back to input $2.5/M), ctx 128000, maxOut 16384, tiers [].
//   gpt-4o-mini/openai: input $0.15/M, output $0.6/M.
// Constants: cost = rate/M * tokens / 1e6 ; mean(0,g,n) = g*(n-1)/2 ; SECONDS/mo = 2_592_000.
import { test, expect } from '@playwright/test';
import {
  waitReady, selectMode, setField, selectModel, MODE_TABS,
  headlineValue, waterfallValue, tokenCount, expectHeadline,
} from './helpers';

test.describe('math validation (rendered $ == hand-computed $)', () => {
  test('A. chatbot default (gpt-4o, empty system prompt) = $143.75/month', async ({ page }) => {
    await waitReady(page);
    // arrivals = 10000 conv * 5 turns = 50000
    // perArrivalInput = 50 user + mean(0,150,5)=300  => 350 ; input = 50000*350*2.5/1e6 = $43.75
    // output = 50000*200*10/1e6 = $100 ; prefix 0 => cacheWrite/reads = $0 ; total = $143.75
    await expectHeadline(page, '$143.75');
    expect(await headlineValue(page)).toBeCloseTo(143.75, 2);
    expect(await waterfallValue(page, 'input')).toBe('$43.75');
    expect(await waterfallValue(page, 'output')).toBe('$100');
    expect(await waterfallValue(page, 'cacheWrite')).toBe('$0');
    expect(await waterfallValue(page, 'cacheReads')).toBe('$0');
    // prefix 0 => central == conservative, band collapses
    await expect(page.getByTestId('confidence-line'))
      .toContainText('conservative (no warm cache) $143.75');
  });

  test('B. prompt/batch (gpt-4o) = $300/month for 100k calls x 300 output tokens', async ({ page }) => {
    await waitReady(page);
    await selectMode(page, MODE_TABS.prompt);
    await setField(page, 'Response (tokens)', 300);
    await setField(page, 'Calls per month', 100000);
    await setField(page, 'Turns per call', 1);
    // arrivals = 100000 ; perArrivalInput = 0 (empty prompt, turns=1 => no context) ; input = $0
    // output = 100000*300*10/1e6 = $300 ; total = $300
    await expectHeadline(page, '$300');
    expect(await headlineValue(page)).toBeCloseTo(300, 2);
    expect(await waterfallValue(page, 'output')).toBe('$300');
  });

  test('C. model swap gpt-4o -> gpt-4o-mini reprices output $100 -> $6 and drops the headline', async ({ page }) => {
    await waitReady(page);
    const before = await headlineValue(page); // $143.75 on gpt-4o
    await selectModel(page, 'gpt-4o-mini|openai');
    // output = 50000*200*0.6/1e6 = $6 (clean) ; input = 50000*350*0.15/1e6 = $2.625 -> displays "$2.63"
    // total = 8.625 -> money() rounds half-up to "$8.63" (assert the DISPLAYED, already-rounded value)
    await expect(page.getByTestId('waterfall-output')).toHaveText('$6', { timeout: 8000 });
    expect(await waterfallValue(page, 'input')).toBe('$2.63');
    const after = await headlineValue(page);
    expect(after).toBeLessThan(before);
    expect(after).toBeCloseTo(8.63, 2); // displayed headline "$8.63"
  });

  test('D. adding a system prompt prices the cold cache-write into the conservative total', async ({ page }) => {
    await waitReady(page);
    await selectMode(page, MODE_TABS.chatbot);
    await setField(page, 'System prompt', 'You are a careful, concise customer-support assistant for an online bookstore.');
    const n = await tokenCount(page); // exact tiktoken count the UI shows AND feeds to the math
    // conservative (p_warm=0): cacheWrite = 50000 * n * 2.5/1e6 = 0.125*n ; input $43.75 + output $100 unchanged
    const expectedConservative = 143.75 + 0.125 * n;
    // wait out the 120ms tokenize + 150ms recompute debounce: the prefix must price into the cache-write bar
    await expect(page.getByTestId('waterfall-cacheWrite')).not.toHaveText('$0', { timeout: 8000 });
    const readConservative = async (): Promise<number> => {
      const line = (await page.getByTestId('confidence-line').textContent()) ?? '';
      const m = line.match(/conservative \(no warm cache\) \$([\d.,]+)/);
      return m ? Number(m[1].replace(/,/g, '')) : 0;
    };
    await expect.poll(readConservative, { timeout: 8000 }).toBeCloseTo(expectedConservative, 1);
    // central headline must be <= conservative (warm cache only ever reduces cost)
    expect(await headlineValue(page)).toBeLessThanOrEqual((await readConservative()) + 0.01);
  });

  test('E. agent step-accumulation table foots to the per-step formula (cold onset, warm thereafter)', async ({ page }) => {
    await waitReady(page);
    await selectMode(page, MODE_TABS.agent);
    // defaults: toolSchema 1500 (prefix), perStepUserSeed 100, obsGrowth 350, actionOutput 150, 6 steps.
    // step1 (cold write $2.5/M prefix): (1500*2.5 + 100*2.5 + 150*10)/1e6 = 5500/1e6 = $0.0055
    // step2 (warm read $1.25/M prefix, input 100+350=450): (1500*1.25 + 450*2.5 + 150*10)/1e6 = 4500/1e6 = $0.0045
    const figure = page.getByRole('group', { name: /cost per agent step/i });
    const tableText = (await figure.locator('table').textContent()) ?? '';
    expect(tableText).toContain('$0.0055');
    expect(tableText).toContain('$0.0045');
    expect(await figure.locator('tbody tr').count()).toBe(6); // one row per step
  });

  test('F. denial of wallet (gpt-4o defaults, both gates) = $483,840/month worst case', async ({ page }) => {
    await waitReady(page);
    await selectMode(page, MODE_TABS.dow);
    await page.getByLabel(/Enable Denial-of-Wallet/).check();
    await page.getByLabel(/authorized to test/).check();
    // arrivals = 1,000,000 req * 1 retry ; input = ctx 128000, output = maxOut 16384, prefix 0
    // input = 1e6*128000*2.5/1e6 = 320000 ; output = 1e6*16384*10/1e6 = 163840 ; total = $483,840
    const exposure = page.getByTestId('dow-exposure');
    await expect(exposure).toContainText('$483,840', { timeout: 8000 });
  });
});
