import { describe, it, expect } from 'vitest';
import { monthlyWarmCost } from '@/engine';
import type { ModelRecord, CacheSpec } from '@/types/registry';
import type { WarmScenario } from '@/types/engine';

const claudeSonnet = (cache: CacheSpec): ModelRecord => ({
  canonicalId: 'claude-3-5-sonnet',
  deployment: 'anthropic',
  displayName: 'Claude 3.5 Sonnet',
  provider: 'anthropic',
  underlyingFamily: 'claude',
  mode: 'chat',
  billingUnit: 'per_token',
  inputPrice: 3.0,
  outputPrice: 15.0,
  reasoningPerMToken: null,
  cache,
  contextWindow: 200000,
  maxOutput: 8192,
  tiers: [],
  accuracyTier: 'estimate',
  freeTier: false,
  deprecated: false,
});

const breakpointCache: CacheSpec = {
  archetype: 'breakpoint_ttl',
  cacheReadPerMToken: 0.3,
  cacheWritePerMToken: 3.75,
  rateUnavailable: false,
  readUnavailable: false,
};

const within1pct = (actual: number, expected: number): boolean =>
  Math.abs(actual - expected) / expected < 0.01;

describe('monthlyWarmCost integration (§8 hand-verified, C10/C12/C13)', () => {
  it('Scenario A: dense Claude breakpoint cache - total within 1% of the hand calc ($287.13)', () => {
    // p_warm = 1-e^-5 = 0.9932621; writes = 43200*0.0067379 = 291.08; warm = 42908.92.
    // cacheWrite 291.08*2000*3.75/1e6 = 2.1831; cacheReads 42908.92*2000*0.3/1e6 = 25.7454;
    // input 43200*500*3/1e6 = 64.8; output 43200*300*15/1e6 = 194.4; total = 287.128.
    const scn: WarmScenario = {
      model: claudeSonnet(breakpointCache),
      prefixTokens: 2000,
      perArrivalInputTokens: 500,
      perArrivalOutputTokens: 300,
      perArrivalReasoningTokens: 0,
      arrivalsPerMonth: 43_200,
      distinctPrefixes: 1,
      ttl: 'min5',
      profile: 'steady',
    };
    const r = monthlyWarmCost(scn);
    expect(r.applicable).toBe(true);
    expect(within1pct(r.centralTotal, 287.13)).toBe(true);
    expect(r.warmth).toBeCloseTo(0.9932621, 5);
  });

  it('C10: conservative (p_warm=0) total exceeds the central, and savingsUpTo carries both figures', () => {
    // conservative: every arrival cold -> cacheWrite 43200*2000*3.75/1e6 = 324; +input 64.8 +output 194.4 = 583.2
    const scn: WarmScenario = {
      model: claudeSonnet(breakpointCache),
      prefixTokens: 2000, perArrivalInputTokens: 500, perArrivalOutputTokens: 300, perArrivalReasoningTokens: 0,
      arrivalsPerMonth: 43_200, distinctPrefixes: 1, ttl: 'min5', profile: 'steady',
    };
    const r = monthlyWarmCost(scn);
    expect(within1pct(r.conservativeTotal, 583.2)).toBe(true);
    expect(r.conservativeTotal).toBeGreaterThan(r.centralTotal);
    expect(r.savingsUpTo.qualifier).toBe('up_to');
    expect(r.savingsUpTo.conservativeReference).toBeCloseTo(r.conservativeTotal, 6);
    expect(r.savingsUpTo.central).toBeCloseTo(r.conservativeTotal - r.centralTotal, 6);
  });

  it('C4: an automatic (best-effort) cache yields a warmth RANGE and a WIDER confidence interval', () => {
    const automatic: CacheSpec = {
      archetype: 'automatic',
      cacheReadPerMToken: 1.25,
      rateUnavailable: false,
      readUnavailable: false,
    };
    const openai = {
      ...claudeSonnet(automatic),
      provider: 'openai',
      inputPrice: 2.5,
      outputPrice: 10.0,
      underlyingFamily: 'openai' as const,
    };
    const scn: WarmScenario = {
      model: openai,
      prefixTokens: 2000, perArrivalInputTokens: 500, perArrivalOutputTokens: 300, perArrivalReasoningTokens: 0,
      arrivalsPerMonth: 43_200, distinctPrefixes: 1, ttl: 'min5', profile: 'steady',
    };
    const r = monthlyWarmCost(scn);
    expect(r.applicable).toBe(true);
    expect(r.warmth).toHaveProperty('lower', 0); // Archetype-A range [0, upper]
    // warmth uncertainty widens the interval above the central
    expect(r.confidence.high).toBeGreaterThan(r.centralTotal);
    expect(r.breakEvenArrivals).toBeNull(); // no write cost -> break-even not applicable
  });

  it('C13: a non-token (per_character) model opts out of warm-cache modeling', () => {
    const perChar = { ...claudeSonnet(breakpointCache), billingUnit: 'per_character' as const };
    const scn: WarmScenario = {
      model: perChar,
      prefixTokens: 2000, perArrivalInputTokens: 500, perArrivalOutputTokens: 300, perArrivalReasoningTokens: 0,
      arrivalsPerMonth: 43_200, distinctPrefixes: 1, ttl: 'min5', profile: 'steady',
    };
    const r = monthlyWarmCost(scn);
    expect(r.applicable).toBe(false);
    expect(r.warmth).toBeNull();
  });

  const baseScn = (over: Partial<WarmScenario>): WarmScenario => ({
    model: claudeSonnet(breakpointCache),
    prefixTokens: 2000,
    perArrivalInputTokens: 500,
    perArrivalOutputTokens: 300,
    perArrivalReasoningTokens: 0,
    arrivalsPerMonth: 43_200,
    distinctPrefixes: 1,
    ttl: 'min5',
    profile: 'steady',
    ...over,
  });

  it('review-fix (finding 3/4): a 1-hr TTL scenario bills the cache write at 2x base (not the 5-min rate)', () => {
    // hr1 conservative write portion = 43200*2000*6.0/1e6 = 518.4; +input 64.8 +output 194.4 = 777.6
    const hr1 = monthlyWarmCost(baseScn({ ttl: 'hr1' }));
    const min5 = monthlyWarmCost(baseScn({ ttl: 'min5' }));
    expect(within1pct(hr1.conservativeTotal, 777.6)).toBe(true);
    expect(hr1.conservativeTotal).toBeGreaterThan(min5.conservativeTotal); // 6.0 > 3.75 write rate
    expect(hr1.warmth).toBeGreaterThan(min5.warmth as number); // T=3600 warms more than T=300
  });

  it('review-fix (finding 10): confidence.high === conservativeTotal and low === centralTotal (no tokenizer band)', () => {
    const r = monthlyWarmCost(baseScn({}));
    expect(r.confidence.high).toBeCloseTo(r.conservativeTotal, 6);
    expect(r.confidence.low).toBeCloseTo(r.centralTotal, 6);
  });

  it('review-fix (finding 8): a readUnavailable cache has no break-even and no free read discount', () => {
    const cache: CacheSpec = { archetype: 'breakpoint_ttl', cacheWritePerMToken: 3.75, rateUnavailable: false, readUnavailable: true };
    const r = monthlyWarmCost(baseScn({ model: claudeSonnet(cache) }));
    expect(r.applicable).toBe(true);
    expect(r.breakEvenArrivals).toBeNull();
  });

  it('review-fix (finding 11): a storage-archetype cache is modeled breakpoint-like (point warmth + write cost)', () => {
    const storage: CacheSpec = { archetype: 'storage', cacheReadPerMToken: 0.3, cacheWritePerMToken: 3.75, rateUnavailable: false, readUnavailable: false };
    const r = monthlyWarmCost(baseScn({ model: claudeSonnet(storage) }));
    expect(r.applicable).toBe(true);
    expect(typeof r.warmth).toBe('number'); // point warmth, not a range
    expect(r.breakEvenArrivals).not.toBeNull();
  });

  it('review-fix (finding 1/2): bursty central total never exceeds the conservative (no negative "up to")', () => {
    const r = monthlyWarmCost(baseScn({ profile: 'bursty', activeFraction: 0.25, burstsPerMonth: 300, arrivalsPerMonth: 720 }));
    expect(r.centralTotal).toBeLessThanOrEqual(r.conservativeTotal);
    expect(r.savingsUpTo.central).toBeGreaterThanOrEqual(0);
    expect(r.writesPerMonth).toBeLessThanOrEqual(720); // writes never exceed arrivals
  });

  it('review-fix (finding 6): negative scenario magnitudes never produce a negative total', () => {
    const r = monthlyWarmCost(baseScn({ arrivalsPerMonth: -100, prefixTokens: -50 }));
    expect(r.centralTotal).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(r.centralTotal)).toBe(true);
  });

  it('C5: NaN scenario inputs never produce a NaN total', () => {
    const scn: WarmScenario = {
      model: claudeSonnet(breakpointCache),
      prefixTokens: NaN, perArrivalInputTokens: 500, perArrivalOutputTokens: 300, perArrivalReasoningTokens: 0,
      arrivalsPerMonth: 43_200, distinctPrefixes: 1, ttl: 'min5', profile: 'steady',
    };
    const r = monthlyWarmCost(scn);
    expect(Number.isFinite(r.centralTotal)).toBe(true);
  });
});
