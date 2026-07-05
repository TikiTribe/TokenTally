import { describe, it, expect } from 'vitest';
import { breakEvenWarmth, breakEvenArrivals } from '@/engine/caching/breakEven';

describe('break-even (§5.3 W2, CORRECTED per C1 - incremental write penalty)', () => {
  it('p_warm* = (cacheWrite-input)/(cacheWrite-cacheRead) for Claude-Sonnet-like rates', () => {
    // 0.75/3.45 = 0.217391 - NOT the spec-literal 0.581395
    expect(breakEvenWarmth(3.0, 0.3, 3.75)).toBeCloseTo(0.217391, 6);
  });
  it('solves the corrected break-even arrivals for T=300, K=1', () => {
    expect(breakEvenArrivals(3.0, 0.3, 3.75, 300, 1)).toBeCloseTo(2118, 0);
  });
  it('returns 0 (caching always pays) when the write rate <= input rate', () => {
    expect(breakEvenWarmth(3.0, 0.3, 2.5)).toBe(0); // writePenalty <= 0
    expect(breakEvenArrivals(3.0, 0.3, 2.5, 300, 1)).toBe(0);
  });
  it('returns null when reads never save (input <= cacheRead)', () => {
    expect(breakEvenWarmth(0.3, 0.3, 3.75)).toBeNull();
    expect(breakEvenArrivals(0.3, 0.5, 3.75, 300, 1)).toBeNull();
  });
  it('review-fix: a bursty break-even scales by the active fraction f (not overstated by 1/f)', () => {
    const steady = breakEvenArrivals(3.0, 0.3, 3.75, 300, 1); // f defaults to 1
    const bursty = breakEvenArrivals(3.0, 0.3, 3.75, 300, 1, 0.25)!;
    expect(bursty).toBeCloseTo(steady! * 0.25, 6);
  });

  it('C5: non-finite inputs never leak NaN', () => {
    expect(breakEvenWarmth(NaN, 0.3, 3.75)).toBeNull();
    expect(breakEvenArrivals(3.0, 0.3, 3.75, NaN, 1)).toBeNull();
  });
});
