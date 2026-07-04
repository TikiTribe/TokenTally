// Pure normalization layer: raw TokenCost entry -> typed ModelRecord.
// No network, no Date.now(), no side effects. Every function is unit-tested test-first.
// This file grows across Phase 0A Tasks 4-9; each section is appended, never rewritten.
// Owner: TokenTally engine. Version: Phase 0A.

import type { BillingUnit, PriceTier } from '@/types/registry';

export type RawEntry = Record<string, unknown>;

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const PER_MILLION = 1_000_000;

// A4 supply-chain guard: reject negative and ~1000x data-poisoning/typo rates on per raw
// token/char values. 1e-2 raw sits just above the highest real rate in the pinned snapshot
// (azure_ai/jais-30b-chat output at 9.71e-3 raw = $9,710/M), so no real model is dropped.
const MAX_RAW_RATE = 1e-2;

function sanePrice(v: number | null, unit: BillingUnit): boolean {
  if (v === null) return true; // absence is handled by the caller, not treated as insane
  if (v < 0) return false;
  if (unit === 'per_token' || unit === 'per_character') return v <= MAX_RAW_RATE;
  return Number.isFinite(v); // per_second / dbu: raw rates vary widely, only require finiteness
}

export function detectBillingUnit(e: RawEntry): BillingUnit {
  // A5: per_character wins when present (Vertex's real billing unit; gemini-1.5-pro and
  // medlm carry both a per-character and a per-token rate — the per-character rate is billed).
  if (num(e.input_cost_per_character) !== null) return 'per_character';
  if (num(e.input_cost_per_second) !== null && num(e.input_cost_per_token) === null) return 'per_second';
  if (num(e.input_dbu_cost_per_token) !== null && num(e.input_cost_per_token) === null) return 'dbu';
  return 'per_token';
}

// Token and character prices scale to per-million; per_second and dbu are stored raw.
// A present-but-insane raw value returns null, which drops the row in normalizeEntry.
export function normalizeInputPrice(e: RawEntry, unit: BillingUnit): number | null {
  switch (unit) {
    case 'per_token': {
      const v = num(e.input_cost_per_token);
      return v !== null && sanePrice(v, unit) ? v * PER_MILLION : null;
    }
    case 'per_character': {
      const v = num(e.input_cost_per_character);
      return v !== null && sanePrice(v, unit) ? v * PER_MILLION : null;
    }
    case 'per_second': {
      const v = num(e.input_cost_per_second);
      return v !== null && sanePrice(v, unit) ? v : null;
    }
    case 'dbu': {
      const v = num(e.input_dbu_cost_per_token);
      return v !== null && sanePrice(v, unit) ? v : null;
    }
  }
}

// A5: output pricing mirrors the input unit switch. An insane output rate omits the field
// (returns null) rather than dropping the whole row.
export function normalizeOutputPrice(e: RawEntry, unit: BillingUnit): number | null {
  switch (unit) {
    case 'per_token': {
      const v = num(e.output_cost_per_token);
      return v !== null && sanePrice(v, unit) ? v * PER_MILLION : null;
    }
    case 'per_character': {
      const v = num(e.output_cost_per_character);
      return v !== null && sanePrice(v, unit) ? v * PER_MILLION : null;
    }
    case 'per_second': {
      const v = num(e.output_cost_per_second);
      return v !== null && sanePrice(v, unit) ? v : null;
    }
    case 'dbu': {
      const v = num(e.output_dbu_cost_per_token);
      return v !== null && sanePrice(v, unit) ? v : null;
    }
  }
}

// A1: key parsing is provider-semantic, not positional. Region routes (bedrock/vertex/azure)
// put the region in the deployment and the model in the trailing segment; aggregators put
// their route in the FIRST segment and the org-namespaced model in the rest. The deployment
// is part of the primary key, so divergent-price SKUs across regions/aggregators stay distinct.
const AGGREGATOR_PROVIDERS = new Set([
  'openrouter', 'deepinfra', 'together_ai', 'fireworks_ai', 'vercel_ai_gateway',
  'anyscale', 'novita', 'featherless_ai', 'lambda_ai', 'aiml',
]);

export function parseKey(
  rawKey: string,
  e: RawEntry,
): { canonicalId: string; deployment: string; provider: string } {
  const provider = typeof e.litellm_provider === 'string' ? e.litellm_provider : 'unknown';
  const parts = rawKey.split('/');
  if (parts.length === 1) return { canonicalId: rawKey, deployment: provider, provider };
  // Bracket indexing under noUncheckedIndexedAccess yields `string | undefined`, guarded with
  // `??`. (Array.prototype.at is ES2022; the project lib targets ES2020, so avoid it here.)
  const head = parts[0] ?? '';
  if (AGGREGATOR_PROVIDERS.has(head)) {
    return { canonicalId: parts.slice(1).join('/'), deployment: head, provider };
  }
  return { canonicalId: parts[parts.length - 1] ?? rawKey, deployment: parts.slice(0, -1).join('/'), provider };
}

// A5: 128k/200k tier parsing is unit-aware for the input/output rate (per-token vs per-character),
// scaled by PER_MILLION only for token/char units; per_second/dbu tiers (none observed) stay raw.
// Cache tiers (`cache_*_input_token_cost_above_*`) are always token rates, so always ×PER_MILLION.
// A12: uses the single PER_MILLION constant.
// The real TokenCost field names use abbreviated thresholds (`_above_128k_tokens`,
// `_above_200k_tokens`), so `thresholdTokens` stays numeric while the field key uses the label.
const TIER_THRESHOLDS: ReadonlyArray<readonly [number, string]> = [
  [128000, '128k'],
  [200000, '200k'],
];

export function parseTiers(e: RawEntry, unit: BillingUnit): PriceTier[] {
  const perUnitScale = unit === 'per_token' || unit === 'per_character' ? PER_MILLION : 1;
  const inputField = (label: string): string =>
    unit === 'per_character'
      ? `input_cost_per_character_above_${label}_tokens`
      : `input_cost_per_token_above_${label}_tokens`;
  const outputField = (label: string): string =>
    unit === 'per_character'
      ? `output_cost_per_character_above_${label}_tokens`
      : `output_cost_per_token_above_${label}_tokens`;
  const tiers: PriceTier[] = [];
  for (const [threshold, label] of TIER_THRESHOLDS) {
    // Keys are derived from the hardcoded threshold list, not user input; the reads are safe.
    const inp = num(e[inputField(label)]);
    const out = num(e[outputField(label)]);
    const cr = num(e[`cache_read_input_token_cost_above_${label}_tokens`]);
    const cw = num(e[`cache_creation_input_token_cost_above_${label}_tokens`]);
    if (inp === null && out === null && cr === null && cw === null) continue;
    tiers.push({
      thresholdTokens: threshold,
      inputPrice: inp === null ? 0 : inp * perUnitScale,
      outputPrice: out === null ? null : out * perUnitScale,
      ...(cr !== null ? { cacheReadPerMToken: cr * PER_MILLION } : {}),
      ...(cw !== null ? { cacheWritePerMToken: cw * PER_MILLION } : {}),
    });
  }
  return tiers;
}
