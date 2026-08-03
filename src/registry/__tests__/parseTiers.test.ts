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

  // Thresholds are DISCOVERED from the entry's own keys, not from a hardcoded list. A hardcoded list
  // silently under-prices every model whose provider invents a new threshold (272k shipped and we kept
  // pricing 42 models flat above their cliff), which is the same stale-literal bug class as the pinned-SHA
  // assertion and the dated provenance comment.
  it('discovers a 272k cliff (OpenAI gpt-5.6-sol: 2x input, 1.5x output above 272k)', () => {
    const e = {
      input_cost_per_token: 5e-6,
      output_cost_per_token: 3e-5,
      input_cost_per_token_above_272k_tokens: 1e-5,
      output_cost_per_token_above_272k_tokens: 4.5e-5,
      cache_read_input_token_cost_above_272k_tokens: 1e-6,
    };
    const tiers = parseTiers(e, 'per_token');
    expect(tiers).toHaveLength(1);
    const t0 = tiers[0]!;
    expect(t0.thresholdTokens).toBe(272000);
    expect(t0.inputPrice).toBeCloseTo(10, 10); // 2x the $5 base
    expect(t0.outputPrice).toBeCloseTo(45, 10); // 1.5x the $30 base
    expect(t0.cacheReadPerMToken).toBeCloseTo(1, 10);
  });

  it('discovers any threshold label, including ones no provider has shipped yet', () => {
    const e = {
      input_cost_per_token_above_256k_tokens: 2e-6,
      input_cost_per_token_above_512k_tokens: 4e-6,
      input_cost_per_token_above_1024k_tokens: 8e-6,
    };
    expect(parseTiers(e, 'per_token').map((t) => t.thresholdTokens)).toEqual([256000, 512000, 1024000]);
  });

  it('returns tiers sorted ascending regardless of upstream key order (A11 byte-stability)', () => {
    const e = {
      input_cost_per_token_above_272k_tokens: 3e-6,
      input_cost_per_token_above_128k_tokens: 1e-6,
      input_cost_per_token_above_200k_tokens: 2e-6,
    };
    expect(parseTiers(e, 'per_token').map((t) => t.thresholdTokens)).toEqual([128000, 200000, 272000]);
  });

  // Service-tier variants are a different product (priority/flex/batch routing), not the standard rate
  // this calculator models. Matching them would silently reprice every standard forecast.
  it('ignores _flex / _priority service-tier variants of the same threshold', () => {
    const e = {
      input_cost_per_token_above_272k_tokens_flex: 5e-6,
      input_cost_per_token_above_272k_tokens_priority: 2e-5,
      output_cost_per_token_above_272k_tokens_flex: 2.25e-5,
    };
    expect(parseTiers(e, 'per_token')).toEqual([]);
  });

  it('A4: rejects an implausible threshold label rather than trusting an upstream typo', () => {
    const e = {
      input_cost_per_token_above_0k_tokens: 1e-6, // would reprice every request from token 1
      input_cost_per_token_above_999999999k_tokens: 1e-6, // unreachable, pure noise
      input_cost_per_token_above_200k_tokens: 6e-6, // the one real tier
    };
    expect(parseTiers(e, 'per_token').map((t) => t.thresholdTokens)).toEqual([200000]);
  });
});
