import { describe, it, expect } from 'vitest';
import { tierFor, effectiveInputRate, effectiveOutputRate, effectiveCacheRates } from '@/engine/cost/rates';
import type { ModelRecord, PriceTier, CacheSpec } from '@/types/registry';
import registrySnapshot from '@/config/registry.generated.json';

const model = (over: Partial<ModelRecord> = {}): ModelRecord => ({
  canonicalId: 'm',
  deployment: 'd',
  displayName: 'm',
  provider: 'anthropic',
  underlyingFamily: 'claude',
  mode: 'chat',
  billingUnit: 'per_token',
  inputPrice: 3.0,
  outputPrice: 15.0,
  reasoningPerMToken: null,
  cache: null,
  contextWindow: null,
  maxOutput: null,
  tiers: [],
  accuracyTier: 'estimate',
  freeTier: false,
  deprecated: false,
  ...over,
});

describe('effective rates + tiers + readUnavailable (C8)', () => {
  it('tierFor returns the highest threshold the token count exceeds', () => {
    const tiers: PriceTier[] = [
      { thresholdTokens: 128000, inputPrice: 4, outputPrice: 20 },
      { thresholdTokens: 200000, inputPrice: 6, outputPrice: 30 },
    ];
    expect(tierFor(50_000, tiers)).toBeNull();
    expect(tierFor(150_000, tiers)?.thresholdTokens).toBe(128000);
    expect(tierFor(250_000, tiers)?.thresholdTokens).toBe(200000);
  });

  it('review-fix (finding 9): tierFor uses an EXCLUSIVE boundary (strictly exceed the threshold)', () => {
    const tiers: PriceTier[] = [
      { thresholdTokens: 128000, inputPrice: 4, outputPrice: 20 },
      { thresholdTokens: 200000, inputPrice: 6, outputPrice: 30 },
    ];
    expect(tierFor(128000, tiers)).toBeNull(); // exactly at the threshold is NOT above it
    expect(tierFor(200000, tiers)?.thresholdTokens).toBe(128000); // 200000 exceeds only 128k
    expect(tierFor(200001, tiers)?.thresholdTokens).toBe(200000);
  });

  it('uses the base input rate below the tier and the tier rate above it', () => {
    const m = model({ tiers: [{ thresholdTokens: 200000, inputPrice: 6, outputPrice: null }] });
    expect(effectiveInputRate(m, 10_000)).toBe(3.0);
    expect(effectiveInputRate(m, 250_000)).toBe(6);
  });

  it('a null tier input price falls back to the base rate (0A amendment E)', () => {
    const m = model({ tiers: [{ thresholdTokens: 200000, inputPrice: null, outputPrice: null, cacheReadPerMToken: 0.6 }] });
    expect(effectiveInputRate(m, 250_000)).toBe(3.0); // no override -> base
  });

  it('embedding output rate is null', () => {
    expect(effectiveOutputRate(model({ mode: 'embedding', outputPrice: null }), 100)).toBeNull();
  });

  it('C8: a readUnavailable cache yields a null read rate (never substitutes 0)', () => {
    const cache: CacheSpec = { archetype: 'breakpoint_ttl', cacheWritePerMToken: 3.75, rateUnavailable: false, readUnavailable: true };
    const r = effectiveCacheRates(model({ cache }), 10_000);
    expect(r.read).toBeNull();
    expect(r.write).toBeCloseTo(3.75, 10);
  });

  it('applies a tiered cache-read rate above the threshold', () => {
    const cache: CacheSpec = { archetype: 'breakpoint_ttl', cacheReadPerMToken: 0.3, cacheWritePerMToken: 3.75, rateUnavailable: false, readUnavailable: false };
    const m = model({ cache, tiers: [{ thresholdTokens: 200000, inputPrice: null, outputPrice: null, cacheReadPerMToken: 0.6 }] });
    expect(effectiveCacheRates(m, 10_000).read).toBeCloseTo(0.3, 10);
    expect(effectiveCacheRates(m, 250_000).read).toBeCloseTo(0.6, 10);
  });

  it('no cache -> null read and write', () => {
    expect(effectiveCacheRates(model({ cache: null }), 100)).toEqual({ read: null, write: null });
  });
});

// Wiring check against the SHIPPED catalog. Everything here is derived from the artifact rather than
// hardcoded, so a price change or a provider retiring a threshold cannot make it stale (the pinned-SHA
// assertion taught us that lesson). What it pins down is the semantics: a cliff reprices the WHOLE
// request, which is how OpenAI documents >272k ("2x input and 1.5x output for the full request") and how
// Anthropic/Google document their long-context tiers.
describe('shipped registry: above-threshold cliffs are wired to the rate functions', () => {
  const tiered = registrySnapshot.models.filter((m) => m.tiers.length > 0) as unknown as ModelRecord[];

  it('the catalog carries tiers at several distinct thresholds', () => {
    const thresholds = new Set(tiered.flatMap((m) => m.tiers.map((t) => t.thresholdTokens)));
    // Discovery is data-driven; a hardcoded list previously found only two and silently priced the rest
    // flat. Requiring >2 distinct thresholds fails loudly if that regression ever returns.
    expect(thresholds.size).toBeGreaterThan(2);
    expect(tiered.length).toBeGreaterThan(60);
  });

  it('every tier with an input override reprices the entire request at the tier rate, not marginally', () => {
    for (const m of tiered) {
      for (const t of m.tiers) {
        if (t.inputPrice === null) continue;
        const below = effectiveInputRate(m, t.thresholdTokens); // exclusive boundary: at == below
        const above = effectiveInputRate(m, t.thresholdTokens + 1);
        expect(below).toBe(m.inputPrice);
        expect(above).toBe(t.inputPrice);
      }
    }
  });

  it('an output override above a threshold applies to the whole request too', () => {
    for (const m of tiered) {
      for (const t of m.tiers) {
        if (t.outputPrice === null) continue;
        expect(effectiveOutputRate(m, t.thresholdTokens + 1)).toBe(t.outputPrice);
      }
    }
  });
});
