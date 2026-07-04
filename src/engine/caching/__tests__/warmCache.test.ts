import { describe, it, expect } from 'vitest';
import {
  perPrefixRate,
  ratePerSecondFromMonthly,
  steadyWarmth,
  burstyWarmth,
  archetypeARange,
  writesPerMonth,
} from '@/engine/caching/warmCache';

describe('warm cache closed form (§5.3, C2/C5/C7)', () => {
  it('steady warmth matches the dense hand-verified anchor', () => {
    const rateS = ratePerSecondFromMonthly(perPrefixRate(43_200, 1));
    expect(steadyWarmth(rateS, 300)).toBeCloseTo(0.9932621, 6);
  });
  it('steady warmth matches the sparse anchor', () => {
    const rateS = ratePerSecondFromMonthly(perPrefixRate(720, 1));
    expect(steadyWarmth(rateS, 300)).toBeCloseTo(0.0799556, 6);
  });
  it('splits the rate across K prefixes and guards K<1', () => {
    expect(perPrefixRate(1000, 4)).toBe(250);
    expect(perPrefixRate(1000, 0)).toBe(1000);
  });
  it('bursty warmth uses the within-busy rate lambda/f', () => {
    const rateS = ratePerSecondFromMonthly(perPrefixRate(720, 1));
    expect(burstyWarmth(rateS, 300, 0.25)).toBeCloseTo(0.2834687, 6);
  });
  it('C7: archetype-A range is [0, upper] (best-effort floor is 0, no fabricated haircut)', () => {
    const rateS = ratePerSecondFromMonthly(perPrefixRate(43_200, 1));
    const r = archetypeARange(rateS, 300);
    expect(r.lower).toBe(0);
    expect(r.upper).toBeCloseTo(0.9932621, 6);
  });
  it('C2: writes/month adds onset*K cold writes and exceeds the steady count', () => {
    const steady = writesPerMonth(720, 1, 0.2834687, 0);
    expect(steady).toBeCloseTo(720 * (1 - 0.2834687), 4);
    const bursty = writesPerMonth(720, 1, 0.2834687, 30);
    expect(bursty).toBeCloseTo(720 * (1 - 0.2834687) + 30, 4); // + onsets*K (K=1)
    expect(bursty).toBeGreaterThan(steady);
  });
  it('C5: NaN / Infinity / non-positive inputs never leak NaN', () => {
    expect(steadyWarmth(0, 300)).toBe(0);
    expect(steadyWarmth(-1, 300)).toBe(0);
    expect(steadyWarmth(NaN, 300)).toBe(0);
    expect(steadyWarmth(Infinity, 300)).toBe(0);
    expect(perPrefixRate(NaN, 1)).toBe(0);
    expect(ratePerSecondFromMonthly(Infinity)).toBe(0);
    expect(Number.isFinite(writesPerMonth(NaN, 1, 0.5, 0))).toBe(true);
    expect(writesPerMonth(NaN, 1, 0.5, 0)).toBe(0);
  });
});
