import { describe, it, expect } from 'vitest';
import { meanAccumulated, totalAccumulated, bounded, CEIL } from '@/workloads/accumulate';

describe('accumulate', () => {
  it('mean over T units of base + (k-1)*growth', () => {
    // base=100, growth=50, units=5: contexts 100,150,200,250,300 -> mean 200
    expect(meanAccumulated(100, 50, 5)).toBe(200);
  });
  it('single unit has no accumulation', () => {
    expect(meanAccumulated(100, 50, 1)).toBe(100);
  });
  it('mean * units === total (conservation oracle)', () => {
    expect(meanAccumulated(100, 50, 5) * 5).toBe(totalAccumulated(100, 50, 5));
  });
  it('clamps hostile inputs to finite non-negative', () => {
    expect(meanAccumulated(-10, 50, 5)).toBe(meanAccumulated(0, 50, 5));
    expect(meanAccumulated(100, Number.NaN, 5)).toBe(100);
    expect(meanAccumulated(100, 50, 0)).toBe(0);
  });

  // P1-A13: overflow/hostile-magnitude clamp so arrivals*tokens never reaches Infinity.
  it('bounded clamps Infinity / huge / negative to [0, CEIL]', () => {
    expect(bounded(Number.POSITIVE_INFINITY)).toBe(CEIL);
    expect(bounded(1e300)).toBe(CEIL);
    expect(bounded(Number.NaN)).toBe(0);
    expect(bounded(-5)).toBe(0);
    expect(bounded(1234)).toBe(1234);
    expect(CEIL).toBe(1e12);
  });
});
