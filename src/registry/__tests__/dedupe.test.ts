import { describe, it, expect } from 'vitest';
import { dedupeRecords } from '@/registry/normalize';
import type { ModelRecord } from '@/types/registry';

const base = (over: Partial<ModelRecord>): ModelRecord => ({
  canonicalId: 'm',
  deployment: 'd',
  displayName: 'm',
  provider: 'p',
  underlyingFamily: 'openai',
  mode: 'chat',
  billingUnit: 'per_token',
  inputPrice: 3,
  outputPrice: 15,
  reasoningPerMToken: null,
  cache: null,
  contextWindow: null,
  maxOutput: null,
  tiers: [],
  accuracyTier: 'exact_unverified',
  freeTier: false,
  deprecated: false,
  ...over,
});

const byKey = (m: ModelRecord): string => `${m.canonicalId}|${m.deployment}`;

describe('dedupeRecords (A3 key = canonicalId|deployment)', () => {
  it('collapses identical (id, deployment, price) duplicates with no conflict', () => {
    const out = dedupeRecords([
      base({ canonicalId: 'gemini-1.5-pro', deployment: 'gemini' }),
      base({ canonicalId: 'gemini-1.5-pro', deployment: 'gemini' }),
    ]);
    expect(out.models).toHaveLength(1);
    expect(out.conflictCount).toBe(0);
  });

  it('KEEPS the same model at different deployments with divergent prices', () => {
    const out = dedupeRecords([
      base({ canonicalId: 'anthropic.claude-3-5-sonnet', deployment: 'bedrock', inputPrice: 3 }),
      base({
        canonicalId: 'anthropic.claude-3-5-sonnet',
        deployment: 'bedrock/us-gov-east-1',
        inputPrice: 3.6,
      }),
    ]);
    expect(out.models).toHaveLength(2);
    expect(out.conflictCount).toBe(0);
  });

  it('A3: same (id, deployment) with a divergent price keeps the first and counts the conflict', () => {
    const out = dedupeRecords([
      base({ canonicalId: 'gpt-4o', deployment: 'openai', inputPrice: 2.5 }),
      base({ canonicalId: 'gpt-4o', deployment: 'openai', inputPrice: 9.9 }),
    ]);
    expect(out.models).toHaveLength(1);
    expect(out.models[0]!.inputPrice).toBe(2.5); // first wins
    expect(out.conflictCount).toBe(1);
  });

  it('A3: is order-independent for the surviving set when there are no conflicts', () => {
    const records = [
      base({ canonicalId: 'a', deployment: 'x' }),
      base({ canonicalId: 'a', deployment: 'y' }),
      base({ canonicalId: 'b', deployment: 'x' }),
      base({ canonicalId: 'a', deployment: 'x' }), // exact dup of the first
    ];
    const forward = dedupeRecords(records);
    const reverse = dedupeRecords([...records].reverse());
    const keys = (r: ReturnType<typeof dedupeRecords>): string[] =>
      r.models.map(byKey).sort();
    expect(keys(forward)).toEqual(keys(reverse));
    expect(forward.models).toHaveLength(3);
    expect(forward.conflictCount).toBe(0);
  });
});
