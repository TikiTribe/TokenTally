// Tokenizer Engine shared types (Phase 0B). Consumed by the resolver, adapters, dispatcher,
// spot-check harness, bootstrap, and worker. Owner: TokenTally engine. Version: Phase 0B.
import type { TokenizerFamily, AccuracyTier } from '@/types/registry';

export type TokenizerEngine = 'tiktoken' | 'transformers' | 'heuristic';

// The four tiktoken encodings the OpenAI catalog needs (o200k for 4o/4.1/5/4.5/o-series,
// cl100k for gpt-4/3.5/embeddings, p50k for davinci-002/text-davinci-*/code-*, r50k for the
// legacy GPT-3 base models incl babbage-002). Narrower than js-tiktoken's own union by design;
// the resolver treats any other value the oracle returns (gpt2/p50k_edit) as an oracle-miss.
export type TiktokenEncoding = 'o200k_base' | 'cl100k_base' | 'p50k_base' | 'r50k_base';

export interface TokenizerResolution {
  family: TokenizerFamily;
  engine: TokenizerEngine;
  encoding: TiktokenEncoding | null;   // set only when engine === 'tiktoken'
  tier: AccuracyTier;                  // aspirational family tier (badge is earned separately, B3)
  flagForReview: boolean;              // B11: true ONLY for an unmatched id (unknown family or an
                                       // OpenAI id the encoding oracle rejected)
}

export interface TokenCount {
  count: number;
  badge: AccuracyTier;                 // the badge the engine that ACTUALLY ran earned (B3)
  engine: TokenizerEngine;
  family: TokenizerFamily;
  flagForReview: boolean;              // B11: unmatched id / needs a resolver rule
  awaitingAdapter: boolean;            // B11: known family whose engine adapter is not registered yet
  // B5: honest error band. null ONLY for an exact/exact_unverified tiktoken content count; every
  // estimate/approx count carries a band so downstream never renders false precision.
  errorBand: { relLow: number; relHigh: number } | null;
  truncated: boolean;                  // B10: input was clamped at the security boundary
}

export interface TokenizerAdapter {
  engine: TokenizerEngine;
  available: boolean;
  // Pure token count for `text` under `resolution`. Throws only on an internal engine failure,
  // which the dispatcher catches and degrades to the heuristic.
  count(text: string, resolution: TokenizerResolution): number;
}

// B1: a spot-check case MUST carry capture provenance so a self-generated number can never
// masquerade as real provider ground truth. Mechanics tests use explicit synthetic sentinels.
export interface SpotCheckCase {
  modelId: string;
  text: string;
  expectedTokens: number;              // captured provider `usage` prompt-token count
  capturedAt: string;                  // ISO date of capture, or a SYNTHETIC sentinel for mechanics tests
  endpoint: string;                    // provider endpoint the number came from
  apiModelSnapshot: string;            // exact model snapshot id billed
  rawUsage: unknown;                   // the raw provider `usage` payload (audit trail)
}

export interface SpotCheckResult {
  passed: boolean;
  cases: Array<{ modelId: string; actual: number; expected: number; relError: number; ok: boolean }>;
}
