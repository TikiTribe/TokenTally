import { describe, it, expect } from 'vitest';
import { resolveCacheSpec, classifyRow } from '@/registry/normalize';

describe('resolveCacheSpec (A2 archetype + readUnavailable, A4 sane rates)', () => {
  it('reads Anthropic read+write as breakpoint_ttl', () => {
    const s = resolveCacheSpec(
      { cache_read_input_token_cost: 3e-7, cache_creation_input_token_cost: 3.75e-6 },
      'anthropic',
    );
    expect(s?.archetype).toBe('breakpoint_ttl');
    expect(s?.cacheReadPerMToken).toBeCloseTo(0.3, 10);
    expect(s?.cacheWritePerMToken).toBeCloseTo(3.75, 10);
    expect(s?.rateUnavailable).toBe(false);
    expect(s?.readUnavailable).toBe(false);
  });

  it('reads DeepSeek cache-hit field as automatic', () => {
    const s = resolveCacheSpec({ input_cost_per_token_cache_hit: 1.4e-8 }, 'deepseek');
    expect(s?.archetype).toBe('automatic');
    expect(s?.cacheReadPerMToken).toBeCloseTo(0.014, 6);
    expect(s?.readUnavailable).toBe(false);
  });

  it('A2: Gemini with supports flag but no rate defaults to automatic (implicit), rateUnavailable', () => {
    const s = resolveCacheSpec({ supports_prompt_caching: true }, 'gemini');
    expect(s).toEqual({ archetype: 'automatic', rateUnavailable: true, readUnavailable: false });
  });

  it('A2: Gemini becomes storage only on an explicit cache-creation signal', () => {
    const s = resolveCacheSpec({ cache_creation_input_token_cost: 4.5e-6 }, 'gemini');
    expect(s?.archetype).toBe('storage');
    expect(s?.cacheWritePerMToken).toBeCloseTo(4.5, 10);
  });

  it('A2: a write rate with no read rate flags readUnavailable so downstream never reads free', () => {
    const s = resolveCacheSpec({ cache_creation_input_token_cost: 3.75e-6 }, 'anthropic');
    expect(s?.archetype).toBe('breakpoint_ttl');
    expect(s?.cacheWritePerMToken).toBeCloseTo(3.75, 10);
    expect(s?.cacheReadPerMToken).toBeUndefined();
    expect(s?.readUnavailable).toBe(true);
    expect(s?.rateUnavailable).toBe(false);
  });

  it('A4: an insane (negative) cache-read rate is omitted, not trusted', () => {
    const s = resolveCacheSpec(
      { cache_read_input_token_cost: -1, cache_creation_input_token_cost: 3.75e-6 },
      'anthropic',
    );
    expect(s?.cacheReadPerMToken).toBeUndefined();
    expect(s?.cacheWritePerMToken).toBeCloseTo(3.75, 10);
    expect(s?.readUnavailable).toBe(true);
  });

  it('returns null when there is no caching at all', () => {
    expect(resolveCacheSpec({ input_cost_per_token: 1e-6 }, 'openai')).toBeNull();
  });
});

describe('classifyRow (A6 mode whitelist)', () => {
  it('keeps a priced-at-zero real model as freeTier', () => {
    expect(
      classifyRow('meta-llama/llama-3-8b-instruct:free', {
        input_cost_per_token: 0,
        output_cost_per_token: 0,
        mode: 'chat',
        litellm_provider: 'openrouter',
      }),
    ).toEqual({ drop: false, freeTier: true });
  });

  it('drops a mode-less pricing bucket', () => {
    expect(classifyRow('together-ai-41.1b-80b', { litellm_provider: 'together_ai' })).toEqual({
      drop: true,
      freeTier: false,
    });
  });

  it('keeps every in-scope mode', () => {
    for (const mode of ['chat', 'completion', 'responses', 'embedding']) {
      expect(classifyRow('m', { input_cost_per_token: 1e-6, mode }).drop).toBe(false);
    }
  });

  it('A6: drops every out-of-scope mode', () => {
    for (const mode of ['image_generation', 'audio_transcription', 'audio_speech', 'rerank', 'moderation']) {
      expect(classifyRow('m', { input_cost_per_token: 1e-6, mode })).toEqual({
        drop: true,
        freeTier: false,
      });
    }
  });
});
