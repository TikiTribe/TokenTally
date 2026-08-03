// Unit-aware effective rates with above-threshold tier overrides (128k/200k/256k/272k/512k today, and
// whatever a provider ships next, since thresholds are discovered from the data rather than hardcoded).
// Rates are already normalized by the 0A registry (per-million for per_token/per_character, raw for
// per_second/dbu). A null tier field falls
// back to the base rate (0A amendment E), and a readUnavailable cache never substitutes 0 for the read
// rate (C8). Owner: TokenTally engine. Version: 0C.
import type { ModelRecord, PriceTier } from '@/types/registry';

// The highest-threshold tier the token count strictly exceeds, or null.
export function tierFor(tokens: number, tiers: readonly PriceTier[]): PriceTier | null {
  let best: PriceTier | null = null;
  for (const t of tiers) {
    if (tokens > t.thresholdTokens && (best === null || t.thresholdTokens > best.thresholdTokens)) {
      best = t;
    }
  }
  return best;
}

// Review finding: rates must be resolved PER FIELD, not from one winning tier. A tier may override only
// some rates (a cache-only tier carries a null inputPrice by design, 0A amendment E). Picking the single
// highest crossed tier and then reading one field off it lets a higher PARTIAL tier shadow a lower
// COMPLETE one and silently drop the rate all the way back to base: with tiers [200k input $6] and
// [272k cache-only], a 300k-token request billed input at the $3 base instead of $6, a 50% understatement
// in the direction that under-reports cost. Resolve each rate independently against the highest crossed
// tier that actually defines it.
function highestDefined(
  tokens: number,
  tiers: readonly PriceTier[],
  pick: (t: PriceTier) => number | null | undefined,
): number | null {
  let best: PriceTier | null = null;
  let bestVal: number | null = null;
  for (const t of tiers) {
    if (tokens <= t.thresholdTokens) continue;
    const v = pick(t);
    if (v === null || v === undefined) continue;
    if (best === null || t.thresholdTokens > best.thresholdTokens) {
      best = t;
      bestVal = v;
    }
  }
  return bestVal;
}

export function effectiveInputRate(model: ModelRecord, tokens: number): number {
  return highestDefined(tokens, model.tiers, (t) => t.inputPrice) ?? model.inputPrice;
}

export function effectiveOutputRate(model: ModelRecord, tokens: number): number | null {
  if (model.outputPrice === null) return null; // embeddings
  return highestDefined(tokens, model.tiers, (t) => t.outputPrice) ?? model.outputPrice;
}

// C8: read is null when the model exposes a write rate but no usable read rate - the cost core must
// never treat that as a free read.
export function effectiveCacheRates(
  model: ModelRecord,
  tokens: number,
): { read: number | null; write: number | null; writeHr1: number | null } {
  const cache = model.cache;
  if (cache === null) return { read: null, write: null, writeHr1: null };
  // Per-field resolution, same reason as the input/output rates above.
  const read = cache.readUnavailable
    ? null
    : (highestDefined(tokens, model.tiers, (t) => t.cacheReadPerMToken) ?? cache.cacheReadPerMToken ?? null);
  const write =
    highestDefined(tokens, model.tiers, (t) => t.cacheWritePerMToken) ?? cache.cacheWritePerMToken ?? null;
  // Upstream's published 1-hour write rate, tier-aware. null means "not published", which sends the caller
  // to the WRITE_MULT derivation rather than to a fabricated number.
  const writeHr1 =
    highestDefined(tokens, model.tiers, (t) => t.cacheWriteHr1PerMToken) ?? cache.cacheWriteHr1PerMToken ?? null;
  return { read, write, writeHr1 };
}
