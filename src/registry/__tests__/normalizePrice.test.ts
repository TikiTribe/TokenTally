import { describe, it, expect } from 'vitest';
import { detectBillingUnit, normalizeInputPrice, normalizeOutputPrice } from '@/registry/normalize';

describe('billing unit + price normalization', () => {
  it('token prices are multiplied to per-million', () => {
    const e = { input_cost_per_token: 2.5e-6, output_cost_per_token: 1e-5 };
    expect(detectBillingUnit(e)).toBe('per_token');
    expect(normalizeInputPrice(e, 'per_token')).toBeCloseTo(2.5, 10);
    expect(normalizeOutputPrice(e, 'per_token')).toBeCloseTo(10, 10);
  });
  it('per-character unit is detected and scaled to per-million-chars', () => {
    const e = { input_cost_per_character: 5e-6 };
    expect(detectBillingUnit(e)).toBe('per_character');
    expect(normalizeInputPrice(e, 'per_character')).toBeCloseTo(5, 10);
  });
  it('A5: per-character wins when both per_char and per_token are present (Vertex precedence)', () => {
    const e = { input_cost_per_character: 3.125e-7, input_cost_per_token: 1.25e-6 };
    expect(detectBillingUnit(e)).toBe('per_character');
  });
  it('A5: per-character output is read in the per-character unit (non-null)', () => {
    const e = { input_cost_per_character: 3.125e-7, output_cost_per_character: 1.25e-6 };
    expect(normalizeOutputPrice(e, 'per_character')).toBeCloseTo(1.25, 10);
  });
  it('A5: per-second is detected and stored raw (not x1e6)', () => {
    const e = { input_cost_per_second: 0.0001 };
    expect(detectBillingUnit(e)).toBe('per_second');
    expect(normalizeInputPrice(e, 'per_second')).toBeCloseTo(0.0001, 12);
    expect(normalizeOutputPrice({ output_cost_per_second: 0.0415 }, 'per_second')).toBeCloseTo(0.0415, 12);
  });
  it('dbu unit is detected', () => {
    const e = { input_dbu_cost_per_token: 1e-5 };
    expect(detectBillingUnit(e)).toBe('dbu');
  });
  it('an entry with no output field yields null output', () => {
    const e = { input_cost_per_token: 2e-8 };
    expect(normalizeOutputPrice(e, 'per_token')).toBeNull();
  });
  it('A4: negative and >MAX_RAW_RATE input rates are rejected as insane (null)', () => {
    expect(normalizeInputPrice({ input_cost_per_token: -1e-6 }, 'per_token')).toBeNull();
    expect(normalizeInputPrice({ input_cost_per_token: 5e-2 }, 'per_token')).toBeNull();
  });
  it('A4: a legit high real rate (jais-30b-chat 0.0032 in / 0.00971 out) is kept', () => {
    expect(normalizeInputPrice({ input_cost_per_token: 0.0032 }, 'per_token')).toBeCloseTo(3200, 6);
    expect(normalizeOutputPrice({ output_cost_per_token: 0.00971 }, 'per_token')).toBeCloseTo(9710, 6);
  });
  it('A5: dbu input rate is stored raw, never x1e6', () => {
    expect(normalizeInputPrice({ input_dbu_cost_per_token: 1e-5 }, 'dbu')).toBeCloseTo(1e-5, 12);
  });
  it('A5: dbu output rate is stored raw, never x1e6', () => {
    expect(normalizeOutputPrice({ output_dbu_cost_per_token: 2e-5 }, 'dbu')).toBeCloseTo(2e-5, 12);
  });
});
