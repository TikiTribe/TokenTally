import { describe, it, expect } from 'vitest';
import { composeConfidence } from '@/engine/cost/confidence';

describe('composeConfidence (C4)', () => {
  it('both bands null -> point estimate, unmodeled variance (never a false interval)', () => {
    expect(composeConfidence(100, null, null)).toEqual({ low: 100, mid: 100, high: 100, unmodeled: true });
  });

  it('honors an asymmetric (directional) tokenizer band without symmetrizing it', () => {
    const r = composeConfidence(100, { relLow: -0.1, relHigh: 0.4 }, null); // Claude-like upward skew
    expect(r.low).toBeCloseTo(90, 6);
    expect(r.high).toBeCloseTo(140, 6);
    expect(r.unmodeled).toBe(false);
  });

  it('adds the systematic (tokenizer) and independent (variance) bands', () => {
    const r = composeConfidence(100, { relLow: -0.1, relHigh: 0.2 }, { relLow: -0.2, relHigh: 0.3 });
    expect(r.high).toBeCloseTo(150, 6); // 100*(1 + 0.2 + 0.3)
    expect(r.low).toBeCloseTo(70, 6); //  100*(1 - 0.1 - 0.2)
  });

  it('C4: clamps the low bound to >= 0 (never a negative dollar cost)', () => {
    const r = composeConfidence(100, { relLow: -0.8, relHigh: 0.2 }, { relLow: -0.5, relHigh: 0.3 });
    expect(r.low).toBe(0);
    expect(r.high).toBeGreaterThanOrEqual(r.mid);
  });

  it('C5: a non-finite central cost yields a finite unmodeled result', () => {
    const r = composeConfidence(NaN, { relLow: -0.1, relHigh: 0.2 }, null);
    expect(Number.isFinite(r.low) && Number.isFinite(r.mid) && Number.isFinite(r.high)).toBe(true);
  });
});
