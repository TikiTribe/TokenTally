import { describe, it, expect } from 'vitest';
import { tierFor, effectiveInputRate, effectiveOutputRate, effectiveCacheRates } from '@/engine/cost/rates';
import type { ModelRecord, PriceTier, CacheSpec, RegistrySnapshot } from '@/types/registry';
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
    expect(effectiveCacheRates(model({ cache: null }), 100)).toEqual({ read: null, write: null, writeHr1: null });
  });

  // Review finding: a higher PARTIAL tier must not shadow a lower COMPLETE one. Reachable now that tier
  // discovery is data-driven and cache-only tiers are an anticipated shape.
  it('resolves each rate against the highest tier that DEFINES it, not the highest tier overall', () => {
    const cache: CacheSpec = { archetype: 'breakpoint_ttl', cacheReadPerMToken: 0.3, cacheWritePerMToken: 3.75, rateUnavailable: false, readUnavailable: false };
    const m = model({
      inputPrice: 3,
      outputPrice: 15,
      cache,
      tiers: [
        { thresholdTokens: 200000, inputPrice: 6, outputPrice: 30 },
        { thresholdTokens: 272000, inputPrice: null, outputPrice: null, cacheReadPerMToken: 1 },
      ],
    });
    // Above BOTH thresholds the 272k tier defines only the cache read, so input/output must still come
    // from the 200k tier rather than collapsing to the $3/$15 base.
    expect(effectiveInputRate(m, 300_000)).toBeCloseTo(6, 10);
    expect(effectiveOutputRate(m, 300_000)).toBeCloseTo(30, 10);
    expect(effectiveCacheRates(m, 300_000).read).toBeCloseTo(1, 10);
    // Between the thresholds only the 200k tier applies.
    expect(effectiveInputRate(m, 250_000)).toBeCloseTo(6, 10);
    expect(effectiveCacheRates(m, 250_000).read).toBeCloseTo(0.3, 10);
  });
});

// Wiring check against the SHIPPED catalog. Everything here is derived from the artifact rather than
// hardcoded, so a price change or a provider retiring a threshold cannot make it stale (the pinned-SHA
// assertion taught us that lesson). What it pins down is the semantics: a cliff reprices the WHOLE
// request, which is how OpenAI documents >272k ("2x input and 1.5x output for the full request") and how
// Anthropic/Google document their long-context tiers.
describe('shipped registry: above-threshold cliffs are wired to the rate functions', () => {
  // Cast the snapshot once, matching bootstrapRegistry, rather than casting the models array.
  const snapshot = registrySnapshot as unknown as RegistrySnapshot;
  const tiered = snapshot.models.filter((m) => m.tiers.length > 0);

  // No counts or threshold values are asserted. Both were magic numbers pinned to whatever upstream
  // happened to ship (256k and 512k each come from a single model), and this suite gates the weekly
  // auto-merged pricing refresh, so an upstream deletion would have turned CI red on a correct registry
  // and blocked the merge for a non-regression.
  it('discovery is alive: the catalog still yields tiers, and none is an empty shell', () => {
    expect(tiered.length).toBeGreaterThan(0); // total discovery failure is the regression worth catching
    for (const m of tiered) {
      for (const t of m.tiers) {
        expect(t.thresholdTokens).toBeGreaterThan(0);
        const definesSomething =
          t.inputPrice !== null ||
          t.outputPrice !== null ||
          t.cacheReadPerMToken !== undefined ||
          t.cacheWritePerMToken !== undefined;
        expect(definesSomething).toBe(true);
      }
    }
  });

  it('crossing a threshold that overrides input reprices the WHOLE request, upward', () => {
    for (const m of tiered) {
      for (const t of m.tiers) {
        if (t.inputPrice === null) continue;
        const below = effectiveInputRate(m, t.thresholdTokens); // exclusive boundary: at == below
        const above = effectiveInputRate(m, t.thresholdTokens + 1);
        // Derived from the record, never from a literal, so a price change cannot make this stale. A
        // second tier on the same model is fine: `below` is then the lower tier's rate, not the base.
        expect(above).toBe(highestInputAt(m, t.thresholdTokens + 1));
        expect(above).toBeGreaterThanOrEqual(below); // every real above-threshold rate is a premium
      }
    }
  });

  it('an output override above a threshold applies to the whole request too', () => {
    for (const m of tiered) {
      for (const t of m.tiers) {
        if (t.outputPrice === null) continue;
        const above = effectiveOutputRate(m, t.thresholdTokens + 1);
        expect(above).toBe(highestOutputAt(m, t.thresholdTokens + 1));
        expect(above).toBeGreaterThanOrEqual(effectiveOutputRate(m, t.thresholdTokens) as number);
      }
    }
  });
});

// Independent re-derivation of "highest crossed tier that defines this field", so the assertions above
// check the rate functions rather than restating them.
function highestInputAt(m: ModelRecord, tokens: number): number {
  const vals = m.tiers
    .filter((t) => tokens > t.thresholdTokens && t.inputPrice !== null)
    .sort((a, b) => b.thresholdTokens - a.thresholdTokens);
  return vals.length > 0 ? (vals[0]!.inputPrice as number) : m.inputPrice;
}

function highestOutputAt(m: ModelRecord, tokens: number): number {
  const vals = m.tiers
    .filter((t) => tokens > t.thresholdTokens && t.outputPrice !== null)
    .sort((a, b) => b.thresholdTokens - a.thresholdTokens);
  return vals.length > 0 ? (vals[0]!.outputPrice as number) : (m.outputPrice as number);
}
