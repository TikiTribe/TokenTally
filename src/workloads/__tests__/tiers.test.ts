import { describe, it, expect } from 'vitest';
import { partitionByTier, detectStraddle, bandedAccumulatedCost } from '@/workloads/tiers';
import type { ModelRecord } from '@/types/registry';

// A model with a single 200k tier: <=200k input $3/Mtok, >200k input $6/Mtok (P1-A7 / DS2 worked example).
const tiered: ModelRecord = {
  canonicalId: 't', deployment: 'x', displayName: 'T', provider: 'x', underlyingFamily: 'openai',
  mode: 'chat', billingUnit: 'per_token', inputPrice: 3, outputPrice: 9, reasoningPerMToken: null, cache: null,
  contextWindow: 1_000_000, maxOutput: 8192,
  tiers: [{ thresholdTokens: 200_000, inputPrice: 6, outputPrice: 18 }],
  accuracyTier: 'estimate', freeTier: false, deprecated: false,
};
const flat: ModelRecord = { ...tiered, tiers: [] };

describe('tiers (P1-A7)', () => {
  it('no tiers / no growth -> a single band with the mean input', () => {
    expect(partitionByTier(flat, 0, 100, 50, 5)).toEqual([{ count: 5, meanInput: 200 }]);
    expect(partitionByTier(tiered, 0, 100, 0, 5)).toEqual([{ count: 5, meanInput: 100 }]);
  });

  it('partitions the DS2 straddle at the 200k boundary (prefix 50k, seed 2k, growth 40k, 8 steps)', () => {
    // tierTokens_k = 50000 + 2000 + (k-1)*40000: k1..k4 <=200k, k5..k8 >200k
    const bands = partitionByTier(tiered, 50_000, 2000, 40_000, 8);
    expect(bands).toHaveLength(2);
    expect(bands[0]).toEqual({ count: 4, meanInput: 62_000 }); // mean of 2k,42k,82k,122k
    expect(bands[1]).toEqual({ count: 4, meanInput: 222_000 }); // mean of 162k,202k,242k,282k
  });

  it('detectStraddle: true across the boundary, false within one tier', () => {
    expect(detectStraddle(tiered, 50_000, 2000, 40_000, 8)).toBe(true);
    expect(detectStraddle(tiered, 0, 100, 50, 5)).toBe(false); // stays well under 200k
    expect(detectStraddle(flat, 50_000, 2000, 40_000, 8)).toBe(false); // no tiers
  });

  it('bandedAccumulatedCost: exact per-band input dollars (DS2: $6.072/run for input alone)', () => {
    // input only (output/reasoning 0), one run: band1 4x mean62k @ $3 = 248000*3/1e6=0.744;
    // band2 4x mean222k @ $6 = 888000*6/1e6=5.328; total 6.072
    const b = bandedAccumulatedCost(tiered, 50_000, 2000, 40_000, 8, 1, 0, 0);
    expect(b.total).toBeCloseTo(6.072, 6);
    expect(b.input).toBeCloseTo(6.072, 6); // P2-A1: per-label breakdown
    expect(b.output).toBe(0);
  });

  it('bandedAccumulatedCost reduces to the mean-fold within a single tier, split by label', () => {
    // all under 200k: input mean = 100 + 50*(5-1)/2 = 200; 10 cycles; output 20 @ $9; reasoning 0
    // input: 10*5*200*3/1e6 = 0.03 ; output: 10*5*20*9/1e6 = 0.009 ; total 0.039
    const b = bandedAccumulatedCost(flat, 0, 100, 50, 5, 10, 20, 0);
    expect(b.total).toBeCloseTo(0.039, 6);
    expect(b.input).toBeCloseTo(0.03, 6);
    expect(b.output).toBeCloseTo(0.009, 6);
  });
});
