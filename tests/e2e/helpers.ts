// Shared E2E helpers for the comprehensive suite. Not a *.spec.ts, so Playwright does not run it as a test.
// Everything drives the REAL rendered UI (built dist/ served under the vercel.json CSP) — no engine imports,
// so the math assertions validate the shipped pipeline end to end, not a re-import of the same functions.
import { expect, type Page, type Locator } from '@playwright/test';

// Registry-ready gate: the snapshot stamp renders "Pricing data as of …" only once the catalog has loaded.
export async function waitReady(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByText(/Pricing data as of/)).toBeVisible({ timeout: 15000 });
}

export const MODE_TABS = {
  chatbot: /^Chatbot$/,
  prompt: /^Prompt \/ Batch$/,
  agent: /^Agent$/,
  crew: /^Multi-agent$/,
  dow: /^Denial of Wallet$/,
} as const;

export async function selectMode(page: Page, tab: RegExp): Promise<void> {
  await page.getByRole('tab', { name: tab }).click();
}

// Fill a labelled number/text field (accessible name === visible label; exact avoids substring collisions
// like "Response (tokens)" vs "Avg response (tokens)").
export async function setField(page: Page, label: string, value: string | number): Promise<void> {
  const input = page.getByLabel(label, { exact: true });
  await input.fill(String(value));
}

export async function selectModel(page: Page, key: string): Promise<void> {
  await page.getByLabel('Model', { exact: true }).selectOption(key);
}

// "$1,234.56" -> 1234.56 ; "$483,840" -> 483840 ; "$0" -> 0
export function parseMoney(text: string): number {
  const m = text.match(/\$\s*([\d.,]+)/); // single char class — no nested quantifier (ReDoS-safe)
  if (!m) throw new Error(`no money token in: ${JSON.stringify(text)}`);
  return Number(m[1].replace(/,/g, ''));
}

// The workload headline ("$X / month") in an <output data-testid=headline-cost>.
export function headline(page: Page): Locator {
  return page.getByTestId('headline-cost');
}
export async function headlineValue(page: Page): Promise<number> {
  return parseMoney((await headline(page).textContent()) ?? '');
}
export async function waterfallValue(page: Page, label: string): Promise<string> {
  return (await page.getByTestId(`waterfall-${label}`).textContent())?.trim() ?? '';
}

// Read the live token count the UI shows for a tokenized textarea ("{n} tokens · {badge}").
export async function tokenCount(page: Page, near: RegExp = /tokens ·/): Promise<number> {
  const span = page.getByText(near).first();
  await expect(span).toBeVisible({ timeout: 10000 });
  const t = (await span.textContent()) ?? '';
  const m = t.match(/([\d,]+)\s+tokens/);
  if (!m) throw new Error(`no token count in: ${JSON.stringify(t)}`);
  return Number(m[1].replace(/,/g, ''));
}

// Wait for the debounced (150ms) recompute to settle on an expected headline string.
export async function expectHeadline(page: Page, expected: string): Promise<void> {
  await expect(headline(page)).toContainText(expected, { timeout: 8000 });
}
