import { describe, it, expect } from 'vitest';
import { componentCost, buildWaterfall } from '@/engine/cost/costCore';

describe('componentCost + waterfall (C3/C9/C11)', () => {
  it('per_token cost = rate * tokens / 1e6', () => {
    expect(componentCost(3.0, 10_000, 'per_token')).toBeCloseTo(0.03, 12);
    expect(componentCost(15.0, 500, 'per_token')).toBeCloseTo(0.0075, 12);
  });

  it('C3: per_character bills CHARACTERS, not tokens (medlm 5/M-char x 40k chars = $0.20)', () => {
    expect(componentCost(5.0, 40_000, 'per_character')).toBeCloseTo(0.2, 12);
  });

  it('C9: per_second and dbu return null (never a token-scaled dollar, never $0)', () => {
    expect(componentCost(0.0001, 1000, 'per_second')).toBeNull();
    expect(componentCost(1e-5, 1000, 'dbu')).toBeNull();
  });

  it('C5: non-finite rate/quantity returns null', () => {
    expect(componentCost(NaN, 1000, 'per_token')).toBeNull();
    expect(componentCost(3.0, Infinity, 'per_token')).toBeNull();
  });

  it('C9/C11: the waterfall total sums only the non-null components and carries native units', () => {
    const w = buildWaterfall([
      { label: 'input', quantity: 10_000, rate: 3.0, unit: 'per_token' },
      { label: 'output', quantity: 500, rate: 15.0, unit: 'per_token' },
      { label: 'audio', quantity: 1000, rate: 0.0001, unit: 'per_second' },
    ]);
    expect(w.total).toBeCloseTo(0.03 + 0.0075, 12);
    const audio = w.components.find((c) => c.label === 'audio');
    expect(audio).toBeDefined();
    expect(audio!.cost).toBeNull();
    expect(audio!.nativeUnit).toBe('per_second');
    const sum = w.components.reduce((s, c) => s + (c.cost ?? 0), 0);
    expect(w.total).toBeCloseTo(sum, 12);
  });
});
