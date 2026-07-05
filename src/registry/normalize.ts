// Pure normalization layer: raw TokenCost entry -> typed ModelRecord.
// No network, no Date.now(), no side effects. Every function is unit-tested test-first.
// This file grows across Phase 0A Tasks 4-9; each section is appended, never rewritten.
// Owner: TokenTally engine. Version: Phase 0A.

import type {
  BillingUnit,
  PriceTier,
  CacheSpec,
  CacheArchetype,
  ModelRecord,
} from '@/types/registry';
import { resolveFamily } from '@/registry/resolveFamily';

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
  // medlm carry both a per-character and a per-token rate - the per-character rate is billed).
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
  // A4: every tier rate passes the same sanity guard as the base rates; an insane (negative/~1000x)
  // or typo'd tier value is treated as absent (null), never scaled into the registry. Cache tiers
  // are always per-token rates. Keys are derived from the hardcoded threshold list, not user input.
  const saneNum = (v: unknown, u: BillingUnit): number | null => {
    const n = num(v);
    return n !== null && sanePrice(n, u) ? n : null;
  };
  const tiers: PriceTier[] = [];
  for (const [threshold, label] of TIER_THRESHOLDS) {
    const inp = saneNum(e[inputField(label)], unit);
    const out = saneNum(e[outputField(label)], unit);
    const cr = saneNum(e[`cache_read_input_token_cost_above_${label}_tokens`], 'per_token');
    const cw = saneNum(e[`cache_creation_input_token_cost_above_${label}_tokens`], 'per_token');
    if (inp === null && out === null && cr === null && cw === null) continue;
    tiers.push({
      thresholdTokens: threshold,
      // null (not 0) when this tier carries no input override, so the cost core reads it as
      // "use the base rate" rather than "free above the threshold".
      inputPrice: inp === null ? null : inp * perUnitScale,
      outputPrice: out === null ? null : out * perUnitScale,
      ...(cr !== null ? { cacheReadPerMToken: cr * PER_MILLION } : {}),
      ...(cw !== null ? { cacheWritePerMToken: cw * PER_MILLION } : {}),
    });
  }
  return tiers;
}

// A2/A8: cache-spec resolution. In-scope text cache fields only: read
// (`cache_read_input_token_cost`), write (`cache_creation_input_token_cost`), and the DeepSeek
// cache-hit read (`input_cost_per_token_cache_hit`). Audio-cache fields
// (`cache_*_input_audio_token_cost`) are out of scope: audio is deferred, so they are ignored here.
// The above-200k tiered cache read/write are wired separately via parseTiers.
//
// Archetype is provider-shaped: Anthropic/Bedrock expose an explicit breakpoint + TTL
// (`breakpoint_ttl`); Gemini/Vertex cache implicitly by default (`automatic`) and only expose a
// `storage` model when an explicit cache-creation (storage) rate is present; everything else is
// implicit/automatic.
const BREAKPOINT_PROVIDERS = /anthropic|bedrock/;
const STORAGE_SIGNAL_PROVIDERS = /gemini|vertex/;

function archetypeFor(provider: string, e: RawEntry): CacheArchetype {
  if (BREAKPOINT_PROVIDERS.test(provider)) return 'breakpoint_ttl';
  if (STORAGE_SIGNAL_PROVIDERS.test(provider)) {
    return num(e.cache_creation_input_token_cost) !== null ? 'storage' : 'automatic';
  }
  return 'automatic';
}

export function resolveCacheSpec(e: RawEntry, provider: string): CacheSpec | null {
  const readRaw = num(e.cache_read_input_token_cost) ?? num(e.input_cost_per_token_cache_hit);
  const writeRaw = num(e.cache_creation_input_token_cost);
  const supported = e.supports_prompt_caching === true || readRaw !== null || writeRaw !== null;
  if (!supported) return null;
  const archetype = archetypeFor(provider, e);
  // A4: an insane (negative / ~1000x) raw cache rate is omitted, never trusted as a real price.
  const read = readRaw !== null && sanePrice(readRaw, 'per_token') ? readRaw : null;
  const write = writeRaw !== null && sanePrice(writeRaw, 'per_token') ? writeRaw : null;
  if (read === null && write === null) {
    // Caching is supported but no usable rate exists: flag rateUnavailable, not free.
    return { archetype, rateUnavailable: true, readUnavailable: false };
  }
  return {
    archetype,
    ...(read !== null ? { cacheReadPerMToken: read * PER_MILLION } : {}),
    ...(write !== null ? { cacheWritePerMToken: write * PER_MILLION } : {}),
    rateUnavailable: false,
    // A2: a write rate with no read rate must never be read as $0 downstream.
    readUnavailable: write !== null && read === null,
  };
}

// A6: whitelist mode to the Phase-0 scope. A row whose mode is absent or outside the whitelist is a
// pricing bucket or a deferred modality (image_generation / audio_* / rerank / moderation), dropped
// and counted. A priced-at-zero row with an in-scope mode is a real free model, kept and flagged.
const ALLOWED_MODES = new Set<string>(['chat', 'completion', 'responses', 'embedding']);

export function classifyRow(_canonicalId: string, e: RawEntry): { drop: boolean; freeTier: boolean } {
  if (typeof e.mode !== 'string' || !ALLOWED_MODES.has(e.mode)) {
    return { drop: true, freeTier: false };
  }
  const inTok = num(e.input_cost_per_token);
  const outTok = num(e.output_cost_per_token);
  const hasAnyUnit =
    inTok !== null ||
    num(e.input_cost_per_character) !== null ||
    num(e.input_cost_per_second) !== null ||
    num(e.input_dbu_cost_per_token) !== null;
  if (!hasAnyUnit) return { drop: true, freeTier: false }; // in-scope mode but no price = junk
  const freeTier = inTok === 0 && (outTok === 0 || outTok === null);
  return { drop: false, freeTier };
}

// A7: id-component safety. A canonicalId/deployment that carries a character outside this class, or
// is a prototype-pollution key, is rejected before it can reach an object map or the DOM. This is a
// latent stored-XSS / proto-pollution defense for the UI phase (model ids render into the page and
// key runtime maps). Underscore, dot, colon, at, slash, and hyphen are the only punctuation real
// TokenCost ids use (e.g. `together_ai`, `anthropic.claude-3-5-sonnet`, `meta-llama/llama-3:free`).
const ID_PATTERN = /^[A-Za-z0-9._:@/-]+$/;
const DANGEROUS_KEYS = new Set<string>(['__proto__', 'constructor', 'prototype']);

function isSafeIdComponent(s: string): boolean {
  return ID_PATTERN.test(s) && !DANGEROUS_KEYS.has(s);
}

export function normalizeEntry(rawKey: string, e: RawEntry): ModelRecord | null {
  const { canonicalId, deployment, provider } = parseKey(rawKey, e);
  // A7: drop unsafe canonicalId/deployment/provider up front (counted by normalizeCatalog as a drop).
  // provider comes from litellm_provider and is a rendered/grouping field (and feeds archetype
  // routing), so it gets the same stored-XSS / proto-pollution firewall as the id and deployment.
  if (
    !isSafeIdComponent(canonicalId) ||
    !isSafeIdComponent(deployment) ||
    !isSafeIdComponent(provider)
  ) {
    return null;
  }
  const { drop, freeTier } = classifyRow(canonicalId, e);
  if (drop) return null;
  const billingUnit = detectBillingUnit(e);
  const inputPrice = normalizeInputPrice(e, billingUnit);
  if (inputPrice === null) return null; // A4: absent or insane input price = unusable row
  const { family, tier } = resolveFamily(canonicalId);
  // classifyRow already proved e.mode is one of the four in-scope modes, so this cast is sound.
  const mode = e.mode as ModelRecord['mode'];
  // A4: the reasoning-token rate is a per-token price and gets the same sanity guard as every other
  // price surface, so a poisoned/typo'd rate is nulled rather than scaled into a mis-bill.
  const reasoningRaw = num(e.output_cost_per_reasoning_token);
  const reasoning = reasoningRaw !== null && sanePrice(reasoningRaw, 'per_token') ? reasoningRaw : null;
  return {
    canonicalId,
    deployment,
    displayName: canonicalId, // A7: derived from the sanitized canonical id
    provider,
    underlyingFamily: family,
    mode,
    billingUnit,
    inputPrice,
    outputPrice: mode === 'embedding' ? null : normalizeOutputPrice(e, billingUnit),
    reasoningPerMToken: reasoning === null ? null : reasoning * PER_MILLION,
    cache: resolveCacheSpec(e, provider),
    contextWindow: num(e.max_input_tokens),
    maxOutput: num(e.max_output_tokens),
    tiers: parseTiers(e, billingUnit),
    accuracyTier: tier,
    freeTier,
    deprecated: e.deprecated === true,
  };
}

export function normalizeCatalog(
  raw: Record<string, RawEntry>,
): { models: ModelRecord[]; droppedCount: number } {
  const models: ModelRecord[] = [];
  let droppedCount = 0;
  for (const [rawKey, entry] of Object.entries(raw)) {
    const rec = normalizeEntry(rawKey, entry);
    if (rec === null) droppedCount++;
    else models.push(rec);
  }
  return { models, droppedCount };
}

// A3: the primary key is (canonicalId, deployment) ONLY. Divergent-price SKUs across deployments
// are already distinct keys and are kept. Two records that collapse to the same key with an
// identical price are silent duplicates; the same key with a DIFFERENT price is a genuine upstream
// anomaly, so the first is kept and the collision is counted (never both, which would break the
// query API's single-record-per-key invariant).
export function dedupeRecords(models: ModelRecord[]): {
  models: ModelRecord[];
  conflictCount: number;
} {
  const seen = new Map<string, ModelRecord>();
  let conflictCount = 0;
  for (const m of models) {
    const key = `${m.canonicalId}|${m.deployment}`;
    const existing = seen.get(key);
    if (existing === undefined) {
      seen.set(key, m);
    } else if (existing.inputPrice !== m.inputPrice || existing.outputPrice !== m.outputPrice) {
      conflictCount++; // keep the first (already in the map), count the divergent-price collision
    }
  }
  return { models: [...seen.values()], conflictCount };
}
