import { describe, it, expect } from 'vitest';
import { normalizeEntry, normalizeCatalog } from '@/registry/normalize';

describe('normalizeEntry', () => {
  it('builds a full ModelRecord for gpt-4o', () => {
    const r = normalizeEntry('gpt-4o', {
      input_cost_per_token: 2.5e-6,
      output_cost_per_token: 1e-5,
      cache_read_input_token_cost: 1.25e-6,
      max_input_tokens: 128000,
      max_output_tokens: 16384,
      litellm_provider: 'openai',
      mode: 'chat',
    });
    expect(r).not.toBeNull();
    expect(r!.canonicalId).toBe('gpt-4o');
    expect(r!.displayName).toBe('gpt-4o');
    expect(r!.deployment).toBe('openai');
    expect(r!.billingUnit).toBe('per_token');
    expect(r!.inputPrice).toBeCloseTo(2.5, 10);
    expect(r!.outputPrice).toBeCloseTo(10, 10);
    expect(r!.underlyingFamily).toBe('openai');
    expect(r!.accuracyTier).toBe('exact_unverified');
    expect(r!.cache?.archetype).toBe('automatic');
    expect(r!.contextWindow).toBe(128000);
    expect(r!.maxOutput).toBe(16384);
  });

  it('carries the per-character billing unit and its 128k tier', () => {
    const r = normalizeEntry('medlm-large', {
      input_cost_per_character: 5e-6,
      input_cost_per_character_above_128k_tokens: 1e-5,
      litellm_provider: 'vertex_ai',
      mode: 'chat',
    });
    expect(r).not.toBeNull();
    expect(r!.billingUnit).toBe('per_character');
    expect(r!.inputPrice).toBeCloseTo(5, 10);
    expect(r!.tiers).toHaveLength(1);
    expect(r!.tiers[0]!.thresholdTokens).toBe(128000);
    expect(r!.tiers[0]!.inputPrice).toBeCloseTo(10, 10);
  });

  it('scales the reasoning-token rate to per-million', () => {
    const r = normalizeEntry('o1', {
      input_cost_per_token: 1.5e-5,
      output_cost_per_token: 6e-5,
      output_cost_per_reasoning_token: 3.5e-6,
      litellm_provider: 'openai',
      mode: 'chat',
    });
    expect(r).not.toBeNull();
    expect(r!.reasoningPerMToken).toBeCloseTo(3.5, 10);
  });

  it('gives embeddings a null output price', () => {
    const r = normalizeEntry('text-embedding-3-small', {
      input_cost_per_token: 2e-8,
      litellm_provider: 'openai',
      mode: 'embedding',
    });
    expect(r).not.toBeNull();
    expect(r!.outputPrice).toBeNull();
  });

  it('drops a mode-less bucket', () => {
    expect(normalizeEntry('together-ai-41.1b-80b', { litellm_provider: 'together_ai' })).toBeNull();
  });

  it('A7: drops a <script>-bearing id (char-class violation)', () => {
    expect(
      normalizeEntry('<script>alert(1)</script>', {
        input_cost_per_token: 1e-6,
        output_cost_per_token: 1e-6,
        litellm_provider: 'openai',
        mode: 'chat',
      }),
    ).toBeNull();
  });

  it('A7: drops a __proto__ id (prototype-pollution key), even though it passes the char class', () => {
    expect(
      normalizeEntry('__proto__', {
        input_cost_per_token: 1e-6,
        output_cost_per_token: 1e-6,
        litellm_provider: 'openai',
        mode: 'chat',
      }),
    ).toBeNull();
  });

  it('A7: drops when the deployment segment carries an unsafe character', () => {
    expect(
      normalizeEntry('bedrock/us<east/anthropic.claude-3-5-sonnet', {
        input_cost_per_token: 3e-6,
        output_cost_per_token: 1.5e-5,
        litellm_provider: 'bedrock',
        mode: 'chat',
      }),
    ).toBeNull();
  });

  it('A7 (review): drops a region-route row whose litellm_provider carries a script payload', () => {
    // deployment (bedrock/us-east-1) and canonicalId are safe, but the provider is not.
    expect(
      normalizeEntry('bedrock/us-east-1/anthropic.claude-3-5-sonnet', {
        input_cost_per_token: 3e-6,
        output_cost_per_token: 1.5e-5,
        litellm_provider: '<img src=x onerror=alert(1)>',
        mode: 'chat',
      }),
    ).toBeNull();
  });

  it('A7 (review): drops a row whose litellm_provider is a prototype-pollution key', () => {
    expect(
      normalizeEntry('bedrock/us-east-1/anthropic.claude-3-5-sonnet', {
        input_cost_per_token: 3e-6,
        output_cost_per_token: 1.5e-5,
        litellm_provider: '__proto__',
        mode: 'chat',
      }),
    ).toBeNull();
  });

  it('A4 (review): drops an insane reasoning-token rate to null', () => {
    const r = normalizeEntry('o1', {
      input_cost_per_token: 1.5e-5,
      output_cost_per_token: 6e-5,
      output_cost_per_reasoning_token: 1.0, // poisoned/typo (real values ~6e-6)
      litellm_provider: 'openai',
      mode: 'chat',
    });
    expect(r).not.toBeNull();
    expect(r!.reasoningPerMToken).toBeNull();
  });

  it('A4 (review): keeps a sane reasoning-token rate scaled to per-million', () => {
    const r = normalizeEntry('o1', {
      input_cost_per_token: 1.5e-5,
      output_cost_per_token: 6e-5,
      output_cost_per_reasoning_token: 6e-6,
      litellm_provider: 'openai',
      mode: 'chat',
    });
    expect(r).not.toBeNull();
    expect(r!.reasoningPerMToken).toBeCloseTo(6, 10);
  });
});

describe('normalizeCatalog', () => {
  it('counts drops across the catalog', () => {
    const out = normalizeCatalog({
      'gpt-4o': {
        input_cost_per_token: 2.5e-6,
        output_cost_per_token: 1e-5,
        litellm_provider: 'openai',
        mode: 'chat',
      },
      'together-ai-41.1b-80b': { litellm_provider: 'together_ai' },
      'dall-e-3': { output_cost_per_pixel: 0, litellm_provider: 'openai', mode: 'image_generation' },
    });
    expect(out.models).toHaveLength(1);
    expect(out.droppedCount).toBe(2);
    expect(out.models[0]!.canonicalId).toBe('gpt-4o');
  });
});
