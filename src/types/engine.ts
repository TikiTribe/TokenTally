// Engine shared types (Phase 0C: Caching Model + Cost Core). Owner: TokenTally engine. Version: 0C.
import type { BillingUnit } from '@/types/registry';

export type TrafficKind = 'steady' | 'bursty';

export interface WarmthRange {
  lower: number;
  upper: number;
}

// C4: honest cost interval. `unmodeled: true` means a point estimate with unmodeled variance
// (low === high === mid) — never a fabricated interval.
export interface ConfidenceRange {
  low: number;
  mid: number;
  high: number;
  unmodeled: boolean;
}

// C9: a component whose model is billed in a non-token unit carries a null `cost` (excluded from the
// token-dollar total) plus its native rate/unit, so it is surfaced, never coerced to $0 or a wrong dollar.
export interface CostComponentEntry {
  label: string;
  cost: number | null;
  nativeUnit?: BillingUnit;
  nativeRate?: number;
}

export interface CostWaterfall {
  components: CostComponentEntry[];
  total: number; // sum of the non-null component costs only
}

// C3: `quantity` is in the unit's NATIVE denomination — tokens for per_token, CHARACTERS for
// per_character — so a per-character SKU is not mis-billed on a token count.
export interface WaterfallBarInput {
  label: string;
  quantity: number;
  rate: number;
  unit: BillingUnit;
}

// C13: the warm-cache scenario is expressed in ARRIVAL terms (lambda = prefix re-hits/month, K =
// distinct prefixes), independent of turns/conversations, so Phase-1 chatbot/agent/crew adapters can
// each produce it without redesign.
export interface WarmScenario {
  model: import('@/types/registry').ModelRecord;
  prefixTokens: number; // cached stable prefix (system prompt / tool-schema block)
  perArrivalInputTokens: number; // non-prefix input per arrival
  perArrivalOutputTokens: number;
  perArrivalReasoningTokens: number;
  arrivalsPerMonth: number; // lambda
  distinctPrefixes: number; // K
  ttl: 'min5' | 'hr1';
  profile: TrafficKind;
  activeFraction?: number; // f (bursty)
  burstsPerMonth?: number; // B (bursty cold onsets, C2)
  tokenizerBand?: { relLow: number; relHigh: number } | null; // systematic bias from the 0B tokenizer
}

export interface WarmCostResult {
  applicable: boolean; // C13: false for non-token billing units (warm-cache modeling opts out)
  warmth: number | WarmthRange | null; // point (breakpoint/storage), range (automatic), or null (n/a)
  centralTotal: number;
  conservativeTotal: number; // p_warm=0 total — the W6 reference AND the Denial-of-Wallet seam (C10/C12)
  savingsUpTo: { central: number; conservativeReference: number; qualifier: 'up_to' };
  writesPerMonth: number;
  waterfall: CostWaterfall;
  confidence: ConfidenceRange;
  breakEvenArrivals: number | null;
}
