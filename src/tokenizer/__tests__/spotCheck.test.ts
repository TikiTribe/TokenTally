import { describe, it, expect } from 'vitest';
import { spotCheckFamily } from '@/tokenizer/spotCheck';
import type { SpotCheckCase } from '@/types/tokenizer';

// B1: SYNTHETIC mechanics fixtures - NOT captured provider usage. These test the harness LOGIC only.
// A real Exact promotion requires a provenance-carrying capture done out-of-band with a real API key;
// none is fabricated here, and the dispatcher leaves OpenAI at exact_unverified in 0B.
const SYNTH: SpotCheckCase[] = [
  {
    modelId: 'synthetic-model',
    text: 'abc',
    expectedTokens: 10,
    capturedAt: 'SYNTHETIC-MECHANICS-TEST',
    endpoint: 'SYNTHETIC',
    apiModelSnapshot: 'SYNTHETIC',
    rawUsage: null,
  },
];

describe('spotCheckFamily (B1: mechanics only, no fabricated captures)', () => {
  it('passes when the counter reproduces expected exactly', () => {
    const res = spotCheckFamily(SYNTH, () => 10, 0.05);
    expect(res.passed).toBe(true);
    expect(res.cases[0]!.ok).toBe(true);
  });

  it('passes a counter within tolerance', () => {
    const res = spotCheckFamily(SYNTH, () => 10.4, 0.05); // 4% < 5%
    expect(res.passed).toBe(true);
  });

  it('fails a counter outside tolerance', () => {
    const res = spotCheckFamily(SYNTH, () => 13, 0.05); // 30% > 5%
    expect(res.passed).toBe(false);
    expect(res.cases[0]!.ok).toBe(false);
  });

  it('reports per-case relative error', () => {
    const res = spotCheckFamily(SYNTH, () => 11, 0.05);
    expect(res.cases[0]!.relError).toBeCloseTo(0.1, 6);
  });

  it('an empty case list never passes (nothing was verified)', () => {
    expect(spotCheckFamily([], () => 0, 0.05).passed).toBe(false);
  });

  it('every case must carry capture provenance (B1 anti-fabrication)', () => {
    for (const c of SYNTH) {
      expect(c.capturedAt.length).toBeGreaterThan(0);
      expect(c.endpoint.length).toBeGreaterThan(0);
      expect(c.apiModelSnapshot.length).toBeGreaterThan(0);
      expect(c).toHaveProperty('rawUsage');
    }
  });
});
