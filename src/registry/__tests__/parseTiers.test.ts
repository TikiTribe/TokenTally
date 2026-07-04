import { describe, it, expect } from 'vitest';
import { parseTiers } from '@/registry/normalize';

describe('parseTiers', () => {
  it('reads a 128k input tier in the per_token unit (Gemini 1.5)', () => {
    const e = { input_cost_per_token: 1.25e-6, input_cost_per_token_above_128k_tokens: 2.5e-6 };
    const tiers = parseTiers(e, 'per_token');
    expect(tiers).toHaveLength(1);
    const t0 = tiers[0];
    expect(t0).toBeDefined();
    expect(t0!.thresholdTokens).toBe(128000);
    expect(t0!.inputPrice).toBeCloseTo(2.5, 10);
  });
  it('A5: reads a 128k input tier in the per-character unit', () => {
    const e = { input_cost_per_character: 3.125e-7, input_cost_per_character_above_128k_tokens: 6.25e-7 };
    const tiers = parseTiers(e, 'per_character');
    expect(tiers).toHaveLength(1);
    const t0 = tiers[0];
    expect(t0).toBeDefined();
    expect(t0!.inputPrice).toBeCloseTo(0.625, 10);
  });
  it('reads a 200k tier with a token-scaled tiered cache-read rate', () => {
    const e = {
      input_cost_per_token_above_200k_tokens: 6e-6,
      cache_read_input_token_cost_above_200k_tokens: 6e-7,
    };
    const tiers = parseTiers(e, 'per_token');
    const t0 = tiers[0];
    expect(t0).toBeDefined();
    expect(t0!.thresholdTokens).toBe(200000);
    expect(t0!.cacheReadPerMToken).toBeCloseTo(0.6, 10);
  });
  it('returns [] when no tier fields exist', () => {
    expect(parseTiers({ input_cost_per_token: 1e-6 }, 'per_token')).toEqual([]);
  });
  it('A4: an insane (>MAX_RAW_RATE) tier input rate is treated as absent, never scaled', () => {
    const e = {
      input_cost_per_token_above_128k_tokens: 1.0, // poisoned/typo: 1.0 raw = $1M/M
      cache_read_input_token_cost_above_128k_tokens: 6e-7,
    };
    const tiers = parseTiers(e, 'per_token');
    const t0 = tiers[0];
    expect(t0).toBeDefined();
    expect(t0!.inputPrice).toBeNull(); // insane input dropped; tier kept for its sane cache rate
    expect(t0!.cacheReadPerMToken).toBeCloseTo(0.6, 10);
  });
  it('A4: a negative tier cache rate is dropped', () => {
    const e = {
      input_cost_per_token_above_200k_tokens: 6e-6,
      cache_read_input_token_cost_above_200k_tokens: -1,
    };
    const tiers = parseTiers(e, 'per_token');
    const t0 = tiers[0];
    expect(t0).toBeDefined();
    expect(t0!.inputPrice).toBeCloseTo(6, 10);
    expect(t0!.cacheReadPerMToken).toBeUndefined();
  });
  it('E: a cache-only tier carries a null input price (no override), never 0', () => {
    const e = { cache_read_input_token_cost_above_200k_tokens: 6e-7 };
    const tiers = parseTiers(e, 'per_token');
    const t0 = tiers[0];
    expect(t0).toBeDefined();
    expect(t0!.thresholdTokens).toBe(200000);
    expect(t0!.inputPrice).toBeNull();
    expect(t0!.cacheReadPerMToken).toBeCloseTo(0.6, 10);
  });
});
