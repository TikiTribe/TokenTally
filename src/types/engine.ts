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
