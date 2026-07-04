import { describe, it, expect } from 'vitest';
import { tierFor, effectiveInputRate, effectiveOutputRate, effectiveCacheRates } from '@/engine/cost/rates';
import type { ModelRecord, PriceTier, CacheSpec } from '@/types/registry';

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
