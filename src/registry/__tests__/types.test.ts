import { describe, it, expect } from 'vitest';
import type { ModelRecord } from '@/types/registry';

describe('ModelRecord shape', () => {
  it('accepts a fully populated record', () => {
    const r: ModelRecord = {
      canonicalId: 'gpt-4o',
      deployment: 'openai',
      displayName: 'GPT-4o',
      provider: 'openai',
      underlyingFamily: 'openai',
      mode: 'chat',
      billingUnit: 'per_token',
      inputPrice: 2.5,
      outputPrice: 10,
      reasoningPerMToken: null,
      // A2: readUnavailable is a required flag so the cost core never reads an
      // undefined cache-read rate as free.
      cache: { archetype: 'automatic', cacheReadPerMToken: 1.25, rateUnavailable: false, readUnavailable: false },
      contextWindow: 128000,
      maxOutput: 16384,
      tiers: [],
      accuracyTier: 'exact_unverified',
      freeTier: false,
      deprecated: false,
    };
    expect(r.canonicalId).toBe('gpt-4o');
    expect(r.billingUnit).toBe('per_token');
  });
});
