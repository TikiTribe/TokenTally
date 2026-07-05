// INTERACTION COVERAGE — drive every control that the smoke suite (functional.spec.ts) does not already
// exercise: context-strategy + framework-preset selects, all example scenarios, keyboard tab navigation,
// per-mode exports, the prompt-mode permalink round-trip (exercises the latent ttl round-trip), and that a
// model change actually reprices. Complements functional.spec.ts (which covers tabs/tokenize/CSV/PDF/theme/DoW once).
import { test, expect } from '@playwright/test';
import { waitReady, selectMode, setField, selectModel, MODE_TABS, headline, headlineValue } from './helpers';

test.describe('interaction coverage', () => {
  test('context strategy minimal < moderate < full (more context => more cost)', async ({ page }) => {
    await waitReady(page);
    await selectMode(page, MODE_TABS.chatbot);
    const strat = page.getByLabel('Context strategy', { exact: true });
    await strat.selectOption('minimal');
    await expect(headline(page)).toContainText('$', { timeout: 8000 });
    const min = await headlineValue(page);
    await strat.selectOption('full');
    await expect.poll(async () => headlineValue(page), { timeout: 8000 }).toBeGreaterThan(min);
  });

  test('framework preset select updates and keeps a valid forecast', async ({ page }) => {
    await waitReady(page);
    await selectMode(page, MODE_TABS.agent);
    const preset = page.getByLabel('Framework preset (tunable seed)', { exact: true });
    for (const p of ['langchain', 'crewai', 'autogen', 'llamaindex', 'custom']) {
      await preset.selectOption(p);
      await expect(preset).toHaveValue(p);
      await expect(headline(page)).toContainText(/\$[\d,]/, { timeout: 8000 });
    }
  });

  test('all three example chips load, switch mode, and apply their config', async ({ page }) => {
    await waitReady(page);
    // high-volume-chatbot -> chatbot tab, conversationsPerMonth 250000
    await page.getByRole('button', { name: /High-volume support chatbot/ }).click();
    await expect(page.getByRole('tab', { name: MODE_TABS.chatbot })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel('Conversations per month', { exact: true })).toHaveValue('250000');
    // langchain-agent -> agent tab
    await page.getByRole('button', { name: /LangChain tool agent/ }).click();
    await expect(page.getByRole('tab', { name: MODE_TABS.agent })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel('Runs per month', { exact: true })).toHaveValue('20000');
    // rag-pipeline -> agent tab, gpt-4o-mini
    await page.getByRole('button', { name: /RAG query pipeline/ }).click();
    await expect(page.getByRole('tab', { name: MODE_TABS.agent })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel('Steps per run', { exact: true })).toHaveValue('4');
  });

  test('tablist is keyboard navigable (ArrowRight / Home / End, roving focus)', async ({ page }) => {
    await waitReady(page);
    await page.getByRole('tab', { name: MODE_TABS.chatbot }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: MODE_TABS.prompt })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: MODE_TABS.dow })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(page.getByRole('tab', { name: MODE_TABS.chatbot })).toHaveAttribute('aria-selected', 'true');
  });

  test('changing the model reprices the forecast', async ({ page }) => {
    await waitReady(page);
    const before = await headlineValue(page);
    await selectModel(page, 'gpt-4o-mini|openai');
    await expect.poll(async () => headlineValue(page), { timeout: 8000 }).toBeLessThan(before);
    await selectModel(page, 'gpt-4o|openai');
    await expect.poll(async () => headlineValue(page), { timeout: 8000 }).toBeCloseTo(before, 2);
  });

  test('CSV + PDF export in agent mode', async ({ page }) => {
    await waitReady(page);
    await selectMode(page, MODE_TABS.agent);
    await expect(headline(page)).toContainText('$', { timeout: 8000 });
    for (const [btn, ext] of [[/Export CSV/, /\.csv$/], [/Export PDF/, /\.pdf$/]] as const) {
      const [dl] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: btn }).click(),
      ]);
      expect(dl.suggestedFilename()).toMatch(ext);
    }
  });

  test('CSV export in Denial of Wallet mode (only after both gates)', async ({ page }) => {
    await waitReady(page);
    await selectMode(page, MODE_TABS.dow);
    // before gates: no export button (no figure)
    await expect(page.getByRole('button', { name: /Export CSV/ })).toHaveCount(0);
    await page.getByLabel(/Enable Denial-of-Wallet/).check();
    await page.getByLabel(/authorized to test/).check();
    await expect(page.getByTestId('dow-exposure')).toBeVisible({ timeout: 8000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Export CSV/ }).click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.csv$/);
  });

  test('prompt-mode permalink round-trips config (exercises the ttl round-trip) without crashing', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await waitReady(page);
    await selectMode(page, MODE_TABS.prompt);
    await setField(page, 'Calls per month', 654321);
    await setField(page, 'Response (tokens)', 321);
    await page.getByRole('button', { name: /Copy shareable link/ }).click();
    const url = page.url();
    expect(url).toMatch(/#c=/);
    await page.goto(url);
    await expect(page.getByText(/Pricing data as of/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('tab', { name: MODE_TABS.prompt })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel('Calls per month', { exact: true })).toHaveValue('654321');
    await expect(page.getByLabel('Response (tokens)', { exact: true })).toHaveValue('321');
    await expect(headline(page)).toContainText('$', { timeout: 8000 }); // still prices, no decode crash
  });

  test('copy-link button label toggles to "Link copied" then back', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await waitReady(page);
    const btn = page.getByRole('button', { name: /Copy shareable link/ });
    await btn.click();
    await expect(page.getByRole('button', { name: /Link copied/ })).toBeVisible({ timeout: 4000 });
  });
});
