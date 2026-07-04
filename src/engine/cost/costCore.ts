// Cost Core: per-component cost + the waterfall. Provider-agnostic, billing-unit-aware. Rates are the
// 0A-normalized per-million (per_token/per_character) values; the quantity is in the unit's NATIVE
// denomination (tokens or CHARACTERS) per C3. A non-token unit (per_second/dbu) is never coerced to a
// token dollar or $0 (C9) — it returns null and is surfaced in its native unit. The bar-quantity
// assignment (each prefix token in exactly one bar, C11) is the caller's responsibility; the Task 7
// integration hand-verifies the total. Owner: TokenTally engine. Version: 0C.
import type { BillingUnit } from '@/types/registry';
import type { CostWaterfall, WaterfallBarInput } from '@/types/engine';

const PER_MILLION = 1_000_000;

export function componentCost(rate: number, quantity: number, unit: BillingUnit): number | null {
  if (!Number.isFinite(rate) || !Number.isFinite(quantity)) return null;
  if (unit !== 'per_token' && unit !== 'per_character') return null; // C9: per_second/dbu not a token dollar
  const v = (rate * quantity) / PER_MILLION;
  return Number.isFinite(v) ? v : null; // guard the PRODUCT: an overflow surfaces as null, not $Infinity
}

export function buildWaterfall(bars: readonly WaterfallBarInput[]): CostWaterfall {
  const components = bars.map((b) => {
    const cost = componentCost(b.rate, b.quantity, b.unit);
    return cost === null
      ? { label: b.label, cost: null, nativeUnit: b.unit, nativeRate: b.rate }
      : { label: b.label, cost };
  });
  const total = components.reduce((sum, c) => sum + (c.cost ?? 0), 0);
  return { components, total };
}
