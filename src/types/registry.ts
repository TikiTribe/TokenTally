// Model Registry shared types (Phase 0A).
// Every registry subsystem (normalize, resolveFamily, query API, build script) and every
// later Phase 0 subsystem (tokenizer, caching, cost core) imports these.
// Owner: TokenTally engine. Version: Phase 0A.

export type BillingUnit = 'per_token' | 'per_character' | 'per_second' | 'dbu';

export type TokenizerFamily =
  | 'openai' | 'llama' | 'mistral' | 'qwen' | 'deepseek' | 'kimi'
  | 'gemini_gemma' | 'cohere' | 'ai21' | 'phi' | 'yi' | 'granite'
  | 'dbrx' | 'perplexity' | 'claude' | 'grok' | 'amazon' | 'voyage'
  | 'aleph_alpha' | 'unknown';

// exact is EARNED only after a per-family fixture spot-check (Phase 0B).
// exact_unverified is the default for a pattern-matched open family.
export type AccuracyTier = 'exact' | 'exact_unverified' | 'approx' | 'estimate';

export type CacheArchetype = 'automatic' | 'breakpoint_ttl' | 'storage';

export interface PriceTier {
  thresholdTokens: number;
  // per-million units, same unit as ModelRecord.inputPrice. null = "no above-threshold override for
  // this rate, fall back to the base rate" (mirrors outputPrice); never 0, so a cache-only or
  // output-only tier is not misread as free input above the threshold.
  inputPrice: number | null;
  outputPrice: number | null;
  cacheReadPerMToken?: number;
  cacheWritePerMToken?: number;
  cacheWriteHr1PerMToken?: number; // upstream's real above-threshold 1-hour write rate, when published
}

export interface CacheSpec {
  archetype: CacheArchetype;
  cacheReadPerMToken?: number;
  cacheWritePerMToken?: number;
  // Upstream's PUBLISHED 1-hour write rate. Present for the SKUs that ship it, so the engine can use a
  // real number instead of the WRITE_MULT.hr1 derivation, which policy.ts labels UNVERIFIED.
  cacheWriteHr1PerMToken?: number;
  rateUnavailable: boolean;           // true when supports_prompt_caching but no rate at all in the data
  readUnavailable: boolean;           // A2: true when a write rate exists but no read rate, so the
                                      // cost core never treats an undefined cache-read rate as free
}

export interface ModelRecord {
  canonicalId: string;
  deployment: string;                 // provider/region route; part of the key
  displayName: string;
  provider: string;
  underlyingFamily: TokenizerFamily;
  mode: 'chat' | 'completion' | 'responses' | 'embedding';
  billingUnit: BillingUnit;
  inputPrice: number;                 // per-million for per_token/per_character; raw for per_second/dbu
  outputPrice: number | null;         // null for embeddings
  reasoningPerMToken: number | null;
  cache: CacheSpec | null;
  contextWindow: number | null;
  maxOutput: number | null;
  tiers: PriceTier[];
  accuracyTier: AccuracyTier;
  freeTier: boolean;
  deprecated: boolean;
}

export interface RegistrySnapshot {
  snapshotVersion: string;            // upstream commit SHA
  snapshotDate: string;               // ISO date passed in at build time
  droppedCount: number;
  conflictCount: number;              // A3: same (canonicalId, deployment) with divergent price; first wins
  // Threshold-bearing upstream keys whose label shape this parser cannot read. Non-zero means some model
  // may be priced flat above a real price cliff, which is the silent-understatement failure mode.
  unparsedTierKeyCount: number;
  models: ModelRecord[];
}
