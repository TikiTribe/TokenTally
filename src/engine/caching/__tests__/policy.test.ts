import { describe, it, expect } from 'vitest';
import {
  writeRateForTtl,
  tEffFor,
  TTL_SECONDS,
  WRITE_MULT,
  SECONDS_PER_MONTH,
} from '@/engine/caching/policy';
import type { CacheSpec } from '@/types/registry';

const bSpec = (over: Partial<CacheSpec> = {}): CacheSpec => ({
  archetype: 'breakpoint_ttl',
  cacheReadPerMToken: 0.3,
  cacheWritePerMToken: 3.75, // = base 3.0 * WRITE_MULT.min5 (1.25) - conforming
  rateUnavailable: false,
  readUnavailable: false,
  ...over,
});

describe('cache policy constants + write-rate-by-TTL (C6/C7/C14)', () => {
  it('exposes the cited TTL/multiplier/month constants', () => {
    expect(TTL_SECONDS).toEqual({ min5: 300, hr1: 3600 });
    expect(WRITE_MULT).toEqual({ min5: 1.25, hr1: 2.0 });
    expect(SECONDS_PER_MONTH).toBe(2_592_000);
  });

  it('C6: 5-min write rate is the registry rate; 1-hr is derived from base input x2.0', () => {
    expect(writeRateForTtl(bSpec(), 'min5', 3.0)).toBeCloseTo(3.75, 10);
    expect(writeRateForTtl(bSpec(), 'hr1', 3.0)).toBeCloseTo(6.0, 10); // 3.0 * 2.0
  });

  it('C6: returns null 1-hr rate when the 5-min rate does not conform to base*1.25', () => {
    // non-conforming: cacheWrite 3.9 but base 3.0 -> expected 3.75, |3.9-3.75|=0.15 > tol
    expect(writeRateForTtl(bSpec({ cacheWritePerMToken: 3.9 }), 'hr1', 3.0)).toBeNull();
  });

  it('returns null 5-min rate when there is no write rate (Archetype A)', () => {
    const a: CacheSpec = { archetype: 'automatic', cacheReadPerMToken: 0.1, rateUnavailable: false, readUnavailable: false };
    expect(writeRateForTtl(a, 'min5', 3.0)).toBeNull();
  });

  it('C14: tEffFor is prototype-safe and defaults unknown / __proto__ providers to a number', () => {
    expect(tEffFor('openai')).toBe(300);
    expect(typeof tEffFor('__proto__')).toBe('number');
    expect(tEffFor('__proto__')).toBe(tEffFor('some-unlisted-provider')); // both hit the default
  });

  // Review finding: above a price cliff the CacheSpec field holds the BASE write rate, so the tier-aware
  // rate must be passed in or every above-cliff cache write is billed at base.
  it('uses the tier-aware 5-minute write rate when one is supplied', () => {
    // base spec: 5-min write 3.75 (= base input 3.0 * 1.25). Above the cliff both double.
    expect(writeRateForTtl(bSpec(), 'min5', 6.0, 7.5)).toBeCloseTo(7.5, 10);
    // hr1 conformance now compares the TIER 5-min (7.5) against tier input 6.0 * 1.25 = 7.5, so it
    // derives rather than bailing to null the way the base 3.75 did.
    expect(writeRateForTtl(bSpec(), 'hr1', 6.0, 7.5)).toBeCloseTo(12.0, 10); // 6.0 * 2.0
  });
});
