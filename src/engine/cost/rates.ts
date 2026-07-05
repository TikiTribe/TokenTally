// Unit-aware effective rates with 128k/200k tier overrides. Rates are already normalized by the 0A
// registry (per-million for per_token/per_character, raw for per_second/dbu). A null tier field falls
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

export function effectiveInputRate(model: ModelRecord, tokens: number): number {
  const tier = tierFor(tokens, model.tiers);
  return tier !== null && tier.inputPrice !== null ? tier.inputPrice : model.inputPrice;
}

export function effectiveOutputRate(model: ModelRecord, tokens: number): number | null {
  if (model.outputPrice === null) return null; // embeddings
  const tier = tierFor(tokens, model.tiers);
  return tier !== null && tier.outputPrice !== null ? tier.outputPrice : model.outputPrice;
}

// C8: read is null when the model exposes a write rate but no usable read rate - the cost core must
// never treat that as a free read.
export function effectiveCacheRates(
  model: ModelRecord,
  tokens: number,
): { read: number | null; write: number | null } {
  const cache = model.cache;
  if (cache === null) return { read: null, write: null };
  const tier = tierFor(tokens, model.tiers);
  const read = cache.readUnavailable
    ? null
    : (tier?.cacheReadPerMToken ?? cache.cacheReadPerMToken ?? null);
  const write = tier?.cacheWritePerMToken ?? cache.cacheWritePerMToken ?? null;
  return { read, write };
}
